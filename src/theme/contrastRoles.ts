import { getContrastRatio } from '@mui/material/styles';
import { hexToHsl, hslToHex } from '../palette/color-utils';
import type { AccentName, Contrast, Mode, ResolvedPalette } from '../palette/types';

interface AccentRoles {
  light: string;
  main: string;
  dark: string;
  darker: string;
  contrastText: string;
}

/** Colors used to display a palette at a given contrast, without changing its swatches. */
export interface ContrastRoles {
  background: string;
  paper: string;
  text: string;
  secondaryText: string;
  disabledText: string;
  divider: string;
  input: string;
  inputHover: string;
  headerBackground: string;
  headerText: string;
  accents: Record<AccentName, AccentRoles>;
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
    main = readableAccent(mode === 'dark' ? light : dark, palette, background, paper);
  }

  return { light, main, dark, darker, contrastText: readableLabel(main, palette) };
}

export function getContrastRoles(palette: ResolvedPalette, mode: Mode, contrast: Contrast): ContrastRoles {
  // fg0/bg0_hard exchange light and dark values between the two mode palettes,
  // producing the requested inverse terminal header in each mode.
  const headerBackground = palette.fg0;
  const headerText = readableLabel(headerBackground, palette);
  const surfaces = {
    soft: {
      background: palette.bg0_soft,
      paper: palette.bg1,
      text: palette.fg2,
      secondaryText: palette.fg3,
      divider: palette.bg2,
      input: palette.bg0_soft,
      inputHover: palette.bg1,
    },
    medium: {
      background: palette.bg0,
      paper: palette.bg1,
      text: palette.fg1,
      secondaryText: palette.fg2,
      divider: palette.bg2,
      input: palette.bg0_soft,
      inputHover: palette.bg1,
    },
    hard: {
      background: palette.bg0_hard,
      paper: palette.bg2,
      text: palette.fg0,
      secondaryText: palette.fg1,
      divider: palette.bg4,
      input: palette.bg1,
      inputHover: palette.bg2,
    },
  }[contrast];

  const accents = Object.fromEntries(
    (['red', 'green', 'yellow', 'blue', 'purple', 'aqua', 'orange'] as const)
      .map((name) => [name, accentRoles(palette, name, mode, contrast, surfaces.background, surfaces.paper)]),
  ) as Record<AccentName, AccentRoles>;

  return { ...surfaces, disabledText: palette.fg4, headerBackground, headerText, accents };
}
