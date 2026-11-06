// ──────────────────────────────────────────────
// MUI Serializer — ModePalettes → standalone six-variant MUI theme module
// ──────────────────────────────────────────────

import type { BaseColors, Contrast, Mode, ModePalette, ModePalettes } from '../types';
import { resolvePalette } from '../resolver';
import { createSunfadeThemeOptions } from '../../theme/sunfadeTheme';

/** Contrast levels exported with every theme. */
const CONTRASTS: readonly Contrast[] = ['soft', 'medium', 'hard'];

/** Appearance modes exported with every theme. */
const MODES: readonly Mode[] = ['dark', 'light'];

/** Variant key used inside the generated module: `${mode}-${contrast}`. */
type Variant = `${Mode}-${Contrast}`;

const BASE_COLOR_KEYS = [
  'red', 'green', 'yellow', 'blue', 'purple', 'aqua', 'orange', 'fg', 'bg',
] as const satisfies readonly (keyof BaseColors)[];

const DEFAULT_VARIANT: Variant = 'dark-medium';

/** Copy a mode palette with deterministic key order for stable serialization. */
function normalizeModePalette(palette: ModePalette): ModePalette {
  const baseColors = {} as BaseColors;
  for (const key of BASE_COLOR_KEYS) {
    baseColors[key] = palette.baseColors[key];
  }
  const overrides: Record<string, string> = {};
  for (const key of Object.keys(palette.overrides).sort()) {
    overrides[key] = palette.overrides[key];
  }
  return { baseColors, overrides };
}

/** Indent every line of a JSON block so it nests cleanly in the generated code. */
function indentBlock(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line, index) => (index === 0 ? line : pad + line))
    .join('\n');
}

/**
 * Serialize both edited mode palettes into a standalone MUI theme module.
 *
 * The generated file contains all six variants — light/dark × soft/medium/hard —
 * resolved from the same shared theme-options source that drives the live site,
 * so the export always matches what was previewed. Output is deterministic
 * (no timestamps), making it safe for snapshot tests and version control.
 */
export function serializeMuiTheme(modePalettes: ModePalettes): string {
  const normalized: ModePalettes = {
    dark: normalizeModePalette(modePalettes.dark),
    light: normalizeModePalette(modePalettes.light),
  };

  const variants: Variant[] = [];
  for (const mode of MODES) {
    for (const contrast of CONTRASTS) {
      variants.push(`${mode}-${contrast}` as Variant);
    }
  }

  const optionsByVariant = new Map<Variant, string>();
  for (const mode of MODES) {
    const { baseColors, overrides } = normalized[mode];
    const resolved = resolvePalette({ baseColors, overrides, mode, contrast: 'medium' });
    for (const contrast of CONTRASTS) {
      const variant = `${mode}-${contrast}` as Variant;
      const options = createSunfadeThemeOptions(resolved, mode, contrast);
      optionsByVariant.set(variant, JSON.stringify(options, null, 2));
    }
  }

  const variantEntries = variants
    .map((variant) => `  '${variant}': ${indentBlock(optionsByVariant.get(variant)!, 2)},`)
    .join('\n');
  const themeEntries = variants
    .map((variant) => `  '${variant}': createTheme(sunfadeThemeOptions['${variant}']),`)
    .join('\n');

  const palettesJson = JSON.stringify(normalized, null, 2);

  return `// ──────────────────────────────────────────────
// Sunfade 1971 — standalone MUI theme export (generated)
// ──────────────────────────────────────────────
//
// This file is self-contained: it depends only on \`@mui/material\` and contains
// all six Sunfade variants — light/dark × soft/medium/hard — resolved from the
// palettes edited in the Sunfade 1971 editor at export time.
//
// ── Quick start ──────────────────────────────────────────────
// import { ThemeProvider, CssBaseline } from '@mui/material';
// import sunfadeTheme from './sunfade-1971-theme';
//
// export default function App() {
//   return (
//     <ThemeProvider theme={sunfadeTheme}>
//       <CssBaseline />
//       <App />
//     </ThemeProvider>
//   );
// }
//
// ── Selecting a variant ──────────────────────────────────────
// import { getSunfadeTheme } from './sunfade-1971-theme';
// const theme = getSunfadeTheme('light', 'hard');
// <ThemeProvider theme={theme}>...</ThemeProvider>
//
// ── Default export ───────────────────────────────────────────
// The default export is the ${DEFAULT_VARIANT} variant (dark/medium).
// \`getSunfadeTheme(mode, contrast)\` returns any of the six themes, keyed by
// \`SunfadeVariant\` (\`SUNFADE_VARIANTS\` lists them all). \`sunfadePalettes\`
// preserves the raw base colors and overrides for each mode, and
// \`sunfadeThemeOptions\` exposes the prebuilt createTheme options if you want
// to compose them with further overrides.
//
// ── Typography ───────────────────────────────────────────────
// The themes use a two-font system (both SIL OFL 1.1):
// - Caskaydia Cove Nerd Font (Cascadia Code + the Nerd Fonts patch,
//   https://github.com/ryanoasis/nerd-fonts) — the base face for body text
//   and monospaced code/terminal/data readouts, requested through the
//   --font-sunfade-caskaydia CSS variable with a "CaskaydiaCove Nerd Font"
//   family fallback.
// - Montserrat (https://fonts.google.com/specimen/Montserrat) — the UI-chrome
//   face for headings, subtitles, captions, labels, buttons and other
//   ordinary controls, requested through the --font-sunfade-montserrat CSS
//   variable with a "Montserrat" family fallback.
// To get the authentic faces, self-host the fonts and either register the CSS
// variables on a wrapping element (as the Sunfade site does with
// next/font/local) or install them under their family names. Without them,
// every variant falls back to standard system stacks and remains fully
// usable.
//
// Generated by Sunfade 1971 — deterministic output, safe to commit.

import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';

// Module augmentation for custom palette extensions
declare module '@mui/material/styles' {
  interface PaletteColor {
    darker?: string;
    /** Sunfade highlight ink: a label with ≥ 4.5:1 contrast on the bright tier. */
    lightContrastText?: string;
    /** Resting contained-fill swatch: the exact neutral tone, unadjusted. */
    neutralFill?: string;
    /** Label ink of at least 4.5:1 contrast on the raw "neutralFill". */
    neutralFillLabel?: string;
  }
  interface SimplePaletteColorOptions {
    darker?: string;
    lightContrastText?: string;
    neutralFill?: string;
    neutralFillLabel?: string;
  }
  interface Palette {
    orange: PaletteColor;
    terminalHeader: { background: string; text: string };
    frame: string;
  }
  interface PaletteOptions {
    orange?: SimplePaletteColorOptions;
    terminalHeader?: { background: string; text: string };
    frame?: string;
  }
}

/** Appearance mode included in this export. */
export type SunfadeMode = 'dark' | 'light';

/** Contrast level included in this export. */
export type SunfadeContrast = 'soft' | 'medium' | 'hard';

/** Variant key: \`\${SunfadeMode}-\${SunfadeContrast}\`. */
export type SunfadeVariant = \`\${SunfadeMode}-\${SunfadeContrast}\`;

/** The nine user-editable base colors that drive all derivations. */
export interface SunfadeBaseColors {
  red: string;
  green: string;
  yellow: string;
  blue: string;
  purple: string;
  aqua: string;
  orange: string;
  fg: string;
  bg: string;
}

/** One mode's edited palette: base colors plus resolved-color overrides. */
export interface SunfadeModePalette {
  baseColors: SunfadeBaseColors;
  overrides: Record<string, string>;
}

/** Every variant included in this export. */
export const SUNFADE_VARIANTS: readonly SunfadeVariant[] = [
${variants.map((variant) => `  '${variant}',`).join('\n')}
];

/** The variant returned by the default export. */
export const DEFAULT_SUNFADE_VARIANT: SunfadeVariant = '${DEFAULT_VARIANT}';

/** Raw edited palettes for both modes, exactly as exported from the editor. */
export const sunfadePalettes: Record<SunfadeMode, SunfadeModePalette> = ${indentBlock(palettesJson, 2)};

/** Prebuilt createTheme() options for each variant. */
export const sunfadeThemeOptions: Record<SunfadeVariant, ThemeOptions> = {
${variantEntries}
};

/** Fully created MUI themes for each variant. */
export const sunfadeThemes: Record<SunfadeVariant, Theme> = {
${themeEntries}
};

/** Returns the theme for a mode/contrast pair, e.g. getSunfadeTheme('light', 'hard'). */
export function getSunfadeTheme(mode: SunfadeMode, contrast: SunfadeContrast): Theme {
  return sunfadeThemes[\`\${mode}-\${contrast}\` as SunfadeVariant];
}

/** The default variant (${DEFAULT_VARIANT}). */
export const sunfadeTheme: Theme = sunfadeThemes[DEFAULT_SUNFADE_VARIANT];

export default sunfadeTheme;
`;
}
