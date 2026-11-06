// ──────────────────────────────────────────────
// Sunfade 1971 theme — single shared theme-options source
// ──────────────────────────────────────────────
//
// This module is the one source of truth for the Sunfade MUI theme. The live
// site (via buildMuiTheme) and the standalone MUI theme export (via the MUI
// serializer) both consume `createSunfadeThemeOptions`, so what you preview
// is exactly what you export.

import type { ThemeOptions } from '@mui/material/styles';
import type { AccentName, Contrast, Mode, ResolvedPalette } from '../palette/types';
import { getContrastRoles } from './contrastRoles';

/** MUI button colors that map to a Sunfade accent (ButtonProps has no `orange`). */
const BUTTON_COLORS = ['primary', 'secondary', 'error', 'warning', 'success', 'info'] as const;

/** UI-chrome stack: Montserrat (SIL OFL 1.1) with portable sans fallbacks.
 * Applied to headings, subtitles, captions, labels, buttons and other
 * ordinary controls via the variant/component overrides below. */
const UI_FONT =
  'var(--font-sunfade-montserrat, "Montserrat"), "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Base/data stack: Caskaydia Cove Nerd Font (Cascadia Code + the Nerd Fonts
 * patch, SIL OFL 1.1) with portable monospace fallbacks. The default face for
 * body text and monospaced code, terminal and data readouts. */
const BODY_FONT =
  'var(--font-sunfade-caskaydia, "CaskaydiaCove Nerd Font"), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

/** MUI palette color → Sunfade accent name. */
const BUTTON_COLOR_ACCENT: Record<(typeof BUTTON_COLORS)[number], AccentName> = {
  primary: 'blue',
  secondary: 'purple',
  error: 'red',
  warning: 'yellow',
  success: 'green',
  info: 'aqua',
};

// Module augmentation for MUI
declare module '@mui/material/styles' {
  interface PaletteColor {
    darker?: string;
    /** Sunfade highlight ink: a label with ≥ 4.5:1 contrast on the bright tier. */
    lightContrastText?: string;
    /** Resting contained-fill swatch: the exact neutral tone, unadjusted. */
    neutralFill?: string;
    /** Label ink ≥ 4.5:1 on the raw `neutralFill`. */
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
  }
  interface PaletteOptions {
    orange?: SimplePaletteColorOptions;
    terminalHeader?: { background: string; text: string };
    frame?: string;
  }
  interface Palette {
    terminalHeader: { background: string; text: string };
    frame: string;
  }
}

/**
 * Build the createTheme() options for one Sunfade variant.
 *
 * The returned options are plain data (no functions, no theme references), so
 * they can be serialized deterministically into the standalone theme export.
 */
export function createSunfadeThemeOptions(
  palette: ResolvedPalette,
  mode: Mode,
  contrast: Contrast,
): ThemeOptions {
  const roles = getContrastRoles(palette, mode, contrast);

  return {
    palette: {
      mode,
      background: {
        default: roles.background,
        paper: roles.paper,
      },
      text: {
        primary: roles.text,
        secondary: roles.secondaryText,
        disabled: roles.disabledText,
      },
      primary: {
        ...roles.accents.blue,
      },
      secondary: {
        ...roles.accents.purple,
      },
      error: {
        ...roles.accents.red,
      },
      warning: {
        ...roles.accents.yellow,
      },
      success: {
        ...roles.accents.green,
      },
      info: {
        ...roles.accents.aqua,
      },
      orange: {
        ...roles.accents.orange,
      },
      terminalHeader: {
        background: roles.headerBackground,
        text: roles.headerText,
      },
      frame: roles.frame,
      divider: roles.divider,
      action: {
        hover: `${roles.text}14`,     // ~8% opacity
        selected: `${roles.text}29`,   // ~16% opacity
        disabled: roles.disabledText,
        disabledBackground: roles.input,
      },
    },
    shape: { borderRadius: 2 },
    typography: {
      // Two-font typography. Caskaydia Cove Nerd Font (the base face below)
      // carries body text and monospaced code/terminal/data readouts;
      // Montserrat carries the UI chrome — headings, subtitles, captions,
      // labels, buttons and other ordinary controls — through the variant
      // and component overrides. The live site self-hosts both faces (SIL
      // OFL 1.1) and exposes them as the --font-sunfade-caskaydia and
      // --font-sunfade-montserrat CSS variables; the same family names and
      // fallback stacks work standalone — consumers who install either face
      // (or map their own variables) get the authentic fonts, everything
      // else falls back to system stacks and remains fully usable. See
      // MUI/README.md for consumer setup instructions.
      fontFamily: BODY_FONT,
      h1: { fontFamily: UI_FONT },
      h2: { fontFamily: UI_FONT },
      h3: { fontFamily: UI_FONT },
      h4: { fontFamily: UI_FONT },
      h5: { fontFamily: UI_FONT },
      h6: { fontFamily: UI_FONT },
      subtitle1: { fontFamily: UI_FONT },
      subtitle2: { fontFamily: UI_FONT },
      caption: { fontFamily: UI_FONT },
      overline: { fontFamily: UI_FONT },
      button: { fontFamily: UI_FONT },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: roles.background,
            color: roles.text,
            backgroundImage: 'none',
          },
          '::selection': {
            // Selection is a transient highlight: bright tier with its own
            // passing label ink, matching the hover treatment of filled fills.
            backgroundColor: roles.accents.blue.light,
            color: roles.accents.blue.lightContrastText,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderColor: roles.frame,
            borderRadius: 2,
          },
          outlined: { borderWidth: 1 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            // Default cards are quiet paper surfaces separated by surface
            // tone, not a frame. The explicitly outlined variant keeps its
            // 1px frame via MuiPaper outlined.
            borderRadius: 2,
            boxShadow: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: roles.headerBackground,
            color: roles.headerText,
            border: `1px solid ${roles.divider}`,
          },
        },
        defaultProps: {
          elevation: 0,
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            fontFamily: UI_FONT,
            color: roles.text,
            borderRadius: 2,
            minHeight: 40,
            '&.Mui-selected': {
              // Inverse video, like a 3270 field selector: the selection is
              // carried by the filled header band + its own label ink, so it
              // stays unmistakable in every variant — including where the
              // input hover tier equals paper — and independently of focus,
              // which is outline-only.
              backgroundColor: roles.headerBackground,
              color: roles.headerText,
            },
            '&:focus-visible': { outline: `1px solid ${roles.accents.blue.main}`, outlineOffset: 2 },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 2,
            boxShadow: 'none',
            minHeight: 40,
            fontWeight: 600,
            textTransform: 'none',
            '&:focus-visible': { outline: `1px solid ${roles.accents.blue.main}`, outlineOffset: 2 },
          },
          contained: { boxShadow: 'none' },
        },
        // Filled fills keep the neutral tone at rest and lift to the bright
        // tier on hover, with a label recomputed for the bright fill — the
        // same highlight treatment the chips use. The frame border that other
        // surfaces use must NOT reach the Button root: text buttons carry no
        // border at all, and outlined borders must track the button's text
        // color, so the rest-state border variable is pinned to the accent
        // main (MUI's default softens it to a 50% alpha tint; MUI already
        // lifts it to full main on hover). Color rules ship as variants:
        // this MUI version restricts styleOverrides keys to ButtonClasses,
        // which no longer contains the color-specific keys.
        variants: [
          ...BUTTON_COLORS.map((color) => {
            const accent = roles.accents[BUTTON_COLOR_ACCENT[color]];
            return {
              props: { color },
              style: {
                // Outlined border must track the button's text color, which is
                // the readability-adjusted text role MUI also uses for the
                // outlined/text ink (`palette[color].main`).
                '--variant-outlinedBorder': accent.main,
                // FILL roles are separated from text roles: the contained
                // resting fill is the exact user neutral swatch — never the
                // readability-adjusted `main` — with a label ink computed for
                // that actual fill.
                '--variant-containedBg': accent.neutralFill,
                '--variant-containedColor': accent.neutralFillLabel,
              },
            };
          }),
          ...BUTTON_COLORS.map((color) => ({
            props: { variant: 'contained' as const, color },
            style: {
              // Match MUI's own convention: wrap hover rules in
              // @media (hover: hover) so a touch tap can't leave a sticky
              // bright hover fill on devices with no hover capability.
              '@media (hover: hover)': {
                '&:hover': {
                  backgroundColor: roles.accents[BUTTON_COLOR_ACCENT[color]].light,
                  color: roles.accents[BUTTON_COLOR_ACCENT[color]].lightContrastText,
                },
              },
            },
          })),
        ],
      },
      MuiButtonBase: {
        styleOverrides: {
          root: {
            '&.Mui-focusVisible': { outline: `1px solid ${roles.accents.blue.main}`, outlineOffset: 2 },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            // Ordinary icon actions are quiet: no standing frame, just the
            // hit-target floor and the shared focus outline.
            borderRadius: 2,
            minWidth: 40,
            minHeight: 40,
            '&:focus-visible': { outline: `1px solid ${roles.accents.blue.main}`, outlineOffset: 2 },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontFamily: UI_FONT,
            border: '1px solid transparent',
            borderRadius: 2,
            color: roles.secondaryText,
            '&.Mui-selected': {
              color: roles.headerText,
              backgroundColor: roles.headerBackground,
            },
            '&:focus-visible': { outline: `1px solid ${roles.accents.blue.main}`, outlineOffset: 1 },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            fontFamily: UI_FONT,
            borderRadius: 2,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 1,
              borderColor: roles.accents.blue.main,
            },
          },
          notchedOutline: { borderWidth: 1, borderColor: roles.frame },
        },
      },
      MuiInput: {
        styleOverrides: {
          underline: {
            '&:after': { borderBottomWidth: 1, borderBottomColor: roles.accents.blue.main },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: roles.secondaryText,
          },
        },
      },
      MuiFilledInput: {
        styleOverrides: {
          root: {
            fontFamily: UI_FONT,
            backgroundColor: roles.input,
            border: `1px solid ${roles.frame}`,
            borderRadius: 2,
            '&:before, &:after': { display: 'none' },
            '&:hover': {
              backgroundColor: roles.inputHover,
            },
            '&.Mui-focused': {
              // Obvious keyboard focus without touching the 1px rule: the
              // fill lifts to the hover tier (a large luminance step from the
              // resting input) and the border takes the independent blue
              // focus accent — ≥ 3:1 (actually ≥ 4.5:1) against the lifted
              // fill and the surrounding paper in every variant.
              backgroundColor: roles.inputHover,
              borderColor: roles.accents.blue.main,
            },
            '&.Mui-disabled': {
              backgroundColor: roles.input,
            },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            fontFamily: UI_FONT,
            // Quiet interior accordions: no filled header band — the summary
            // stays a plain row on paper, with the inverse band reserved for
            // real headers (AppBar, terminal title bars, selected toggles).
            color: roles.text,
            borderRadius: 2,
            '&.Mui-expanded': { minHeight: 44, borderBottom: `1px solid ${roles.divider}` },
          },
          content: { '&.Mui-expanded': { margin: '12px 0' } },
          expandIconWrapper: {
            color: roles.secondaryText,
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            // Interior sections stay quiet: the paper surface tone separates
            // them; no standing frame. The expanded summary keeps a 1px
            // divider (see MuiAccordionSummary).
            boxShadow: 'none',
            '&:before': { display: 'none' },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontFamily: UI_FONT,
            border: `1px solid ${roles.frame}`,
            borderRadius: 2,
            '&.MuiChip-filledPrimary': {
              backgroundColor: roles.accents.blue.main, color: roles.accents.blue.contrastText,
              '&:hover': { backgroundColor: roles.accents.blue.light, color: roles.accents.blue.lightContrastText },
            },
            '&.MuiChip-filledSecondary': {
              backgroundColor: roles.accents.purple.main, color: roles.accents.purple.contrastText,
              '&:hover': { backgroundColor: roles.accents.purple.light, color: roles.accents.purple.lightContrastText },
            },
            '&.MuiChip-filledError': {
              backgroundColor: roles.accents.red.main, color: roles.accents.red.contrastText,
              '&:hover': { backgroundColor: roles.accents.red.light, color: roles.accents.red.lightContrastText },
            },
            '&.MuiChip-filledWarning': {
              backgroundColor: roles.accents.yellow.main, color: roles.accents.yellow.contrastText,
              '&:hover': { backgroundColor: roles.accents.yellow.light, color: roles.accents.yellow.lightContrastText },
            },
            '&.MuiChip-filledSuccess': {
              backgroundColor: roles.accents.green.main, color: roles.accents.green.contrastText,
              '&:hover': { backgroundColor: roles.accents.green.light, color: roles.accents.green.lightContrastText },
            },
            '&.MuiChip-filledInfo': {
              backgroundColor: roles.accents.aqua.main, color: roles.accents.aqua.contrastText,
              '&:hover': { backgroundColor: roles.accents.aqua.light, color: roles.accents.aqua.lightContrastText },
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            border: `1px solid ${roles.frame}`,
            borderRadius: 2,
            '&.MuiAlert-filledError': { backgroundColor: roles.accents.red.main, color: roles.accents.red.contrastText },
            '&.MuiAlert-filledWarning': { backgroundColor: roles.accents.yellow.main, color: roles.accents.yellow.contrastText },
            '&.MuiAlert-filledSuccess': { backgroundColor: roles.accents.green.main, color: roles.accents.green.contrastText },
            '&.MuiAlert-filledInfo': { backgroundColor: roles.accents.aqua.main, color: roles.accents.aqua.contrastText },
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            border: `1px solid ${roles.frame}`,
            borderRadius: 2,
            boxShadow: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: roles.paper,
            borderColor: roles.frame,
            borderRadius: 2,
            boxShadow: 'none',
          },
          root: {
            '&.MuiDrawer-modal .MuiDrawer-paper': { border: `1px solid ${roles.frame}` },
            '&.MuiDrawer-docked .MuiDrawer-paper': { border: `1px solid ${roles.frame}` },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            border: `1px solid ${roles.frame}`,
            borderRadius: 2,
            boxShadow: 'none',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { fontFamily: UI_FONT, border: `1px solid ${roles.frame}`, borderRadius: 2 },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { fontFamily: UI_FONT },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: { fontFamily: UI_FONT },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: roles.divider },
        },
      },
    },
  };
}
