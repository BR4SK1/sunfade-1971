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
import { getContrastRoles, type ContrastRoles } from './contrastRoles';

/** MUI button colors that map to a Sunfade accent (ButtonProps has no
 * `orange`). `secondary` is not here: it is structural chrome built from the
 * fg family (`roles.secondary`), not an accent. */
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

// ── Alert fill/ink math ──
//
// MUI's stock "standard" (tinted) alert derives its fill from
// lighten/darken(palette[severity].light, 0.9): in light mode that is a
// near-white cool pastel that fights the warm putty paper, and in dark mode a
// near-black tier darker than the surface itself. The standard variant is now
// styled with PALETTE-NATIVE NAMED PAIRS (see standardAlertTreatment below):
// dark mode fills `bg0_hard` with the `bright_` same-hue swatch, light mode
// fills `bg0` with the `deep_` same-hue swatch — flat named surfaces, no
// blends — selected from the full same-hue tier × named-surface matrix, with
// a best-effort named pair (never a blend or MUI stock) for degenerate
// palettes where nothing clears the bars. All values are computed here and
// stored as plain hex strings — plain serializable data for the standalone
// theme export.

/** Severity → accent name for alert tinting. */
const ALERT_SEVERITY_ACCENT: Record<string, AccentName> = {
  error: 'red',
  warning: 'yellow',
  success: 'green',
  info: 'blue',
};

// ── Standard-alert palette-native treatment ──
//
// The standard alert fill/ink are selected ONLY from RESOLVED NAMED SWATCHES
// of the user's palette — same-hue accent tiers on named background surfaces.
// No blends, no invented colors, no MUI-stock fallback. Verified at full WCAG
// precision on the rev-25 defaults, across all six default variants:
//   dark:  fill `bg0_hard`, ink `bright_<accent>`  (text 4.996…, icon 4.296…)
//   light: fill `bg0`,      ink `deep_<accent>`    (worst: warning 6.379/5.092)
// The near-failing dark pair (`bg0` + `bright_red`, 4.4963… < 4.5) is
// deliberately avoided by the candidate order.
//
// Selection: for each named surface (mode-preferred fill first), try every
// same-hue tier, ordered by luminance distance from the surface (largest
// first, stable tie-break by the mode's tier order). The first pair clearing
// BOTH bars (text ≥ 4.5, icon ≥ 3.0 composited at the MUI icon opacity of
// 0.9, unrounded) is used. If NO same-hue named pair clears both bars —
// possible for degenerate custom palettes, and accepted by explicit user
// decision — the pair with the highest text ratio (ties: higher icon ratio,
// then candidate order) is used and reported as `best-effort` with its true
// measured ratios. A best-effort pair is still two named palette swatches;
// it must never be presented as passing.

/** WCAG 2.x relative luminance of an 8-bit sRGB channel triplet. */
function wcagLuminance(rgb: readonly number[]): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

/** WCAG contrast of `ink` over `fill`, with the ink alpha-composited at
 * `alpha` (the icon case) — unrounded, matching the browser-verified lab
 * math. Opaque inks pass straight through. */
function wcagContrast(inkHex: string, alpha: number, fillHex: string): number {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  };
  const ink = parse(inkHex);
  const fill = parse(fillHex);
  const eff = alpha < 1 ? ink.map((v, i) => alpha * v + (1 - alpha) * fill[i]) : ink;
  const lf = wcagLuminance(eff);
  const lb = wcagLuminance(fill);
  return (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
}

/** MUI renders the standard-alert icon at 0.9 opacity; the composited icon
 * must clear the 3:1 icon bar against the fill. */
const ALERT_ICON_OPACITY = 0.9;
const ALERT_TEXT_MIN = 4.5;
const ALERT_ICON_MIN = 3.0;

/** Named alert-fill surfaces per mode, mode-preferred surface first. `bg3`
 * and `bg4` are chrome/border tiers, not alert fills, and are excluded. */
const ALERT_STANDARD_SURFACES: Record<Mode, Array<keyof ResolvedPalette>> = {
  dark: ['bg0_hard', 'bg0', 'bg0_soft', 'bg1', 'bg2'],
  light: ['bg0', 'bg0_hard', 'bg0_soft', 'bg1', 'bg2'],
};

/** Same-hue accent tiers, in the mode's natural ink-direction order (used as
 * the stable tie-break of the luminance-distance ordering). */
const ALERT_STANDARD_TIERS: Record<Mode, string[]> = {
  dark: ['bright_', 'neutral_', 'faded_', 'deep_'],
  light: ['deep_', 'neutral_', 'faded_', 'bright_'],
};

/** Result of the standard-alert treatment selection for one severity. */
export interface StandardAlertTreatment {
  fill: string;
  ink: string;
  /** `passing` = clears both bars unrounded; `best-effort` = best available
   * same-hue named pair on a palette where NONE clears both bars (accepted
   * by explicit user decision; must never be presented as passing). */
  quality: 'passing' | 'best-effort';
  /** True unrounded ratios of the chosen pair (informational; tests
   * recompute them independently). */
  textRatio: number;
  iconRatio: number;
}

/** Select the standard-alert fill/ink for one severity from the resolved
 * palette. Exported for tests so assertions check the actual selection rule
 * instead of re-deriving it. The icon uses the same ink (at MUI's 0.9
 * opacity). Deterministic: identical palettes always select identical pairs. */
/** Parse a hex color into sRGB channels. */
function wcagParseChannels(hex: string): number[] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** Select the standard-alert fill/ink for one severity from the resolved
 * palette. Exported for tests so assertions check the actual selection rule
 * instead of re-deriving it. The icon uses the same ink (at MUI's 0.9
 * opacity). Deterministic: identical palettes always select identical pairs. */
export function standardAlertTreatment(
  palette: ResolvedPalette,
  mode: Mode,
  accentName: AccentName,
): StandardAlertTreatment {
  const tierOrder = ALERT_STANDARD_TIERS[mode];

  // Best-effort tracker: highest text ratio wins; ties broken by higher icon
  // ratio, then by candidate walk order. Only used if nothing passes.
  let best: { fill: string; ink: string; textRatio: number; iconRatio: number; order: number } | null = null;
  let order = 0;

  for (const surfaceKey of ALERT_STANDARD_SURFACES[mode]) {
    const fill = palette[surfaceKey] as string;
    const fillLum = wcagLuminance(wcagParseChannels(fill));
    // Tiers ordered by luminance distance from the fill (largest contrast
    // direction first); stable tie-break on the mode's natural tier order.
    const tiers = tierOrder
      .map((tier, orderIndex) => ({
        tier,
        orderIndex,
        distance: Math.abs(
          wcagLuminance(wcagParseChannels(palette[`${tier}${accentName}` as keyof ResolvedPalette] as string)) - fillLum,
        ),
      }))
      .sort((a, b) => b.distance - a.distance || a.orderIndex - b.orderIndex);

    for (const { tier } of tiers) {
      const ink = palette[`${tier}${accentName}` as keyof ResolvedPalette] as string;
      const textRatio = wcagContrast(ink, 1, fill);
      const iconRatio = wcagContrast(ink, ALERT_ICON_OPACITY, fill);
      if (textRatio >= ALERT_TEXT_MIN && iconRatio >= ALERT_ICON_MIN) {
        // First passing pair in the deterministic walk wins.
        return { fill, ink, quality: 'passing', textRatio, iconRatio };
      }
      if (
        !best ||
        textRatio > best.textRatio ||
        (textRatio === best.textRatio && iconRatio > best.iconRatio)
      ) {
        best = { fill, ink, textRatio, iconRatio, order };
      }
      order++;
    }
  }

  // No same-hue named pair clears both bars on this palette (degenerate
  // custom palettes; accepted by explicit user decision). Return the best
  // available named pair with its TRUE ratios — never presented as passing.
  return {
    fill: best!.fill,
    ink: best!.ink,
    quality: 'best-effort',
    textRatio: best!.textRatio,
    iconRatio: best!.iconRatio,
  };
}

/** MUI palette color → Sunfade accent name. `secondary` maps to the fg-family
 * chrome roles (`roles.secondary`) instead of an accent. */
const BUTTON_COLOR_ACCENT: Record<Exclude<(typeof BUTTON_COLORS)[number], 'secondary'>, AccentName> = {
  primary: 'orange',
  error: 'red',
  warning: 'yellow',
  success: 'green',
  info: 'blue',
};

/** Roles that drive one MUI color: an accent for every semantic color, the
 * fg-family chrome roles for `secondary`. */
function colorRoles(color: (typeof BUTTON_COLORS)[number], roles: ContrastRoles) {
  return color === 'secondary' ? roles.secondary : roles.accents[BUTTON_COLOR_ACCENT[color]];
}

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

  // Keyboard-focus treatment: the exact `bright_orange` palette swatch —
  // by explicit user direction, superseding the former `bg0_hard` swatch
  // (which had itself superseded the blue focus accent). This remains a
  // deliberate, user-accepted trade-off. In dark mode the orange line sits
  // near or above the 3:1 non-text contrast WCAG asks of a focus indicator
  // against the page background and paper; in light mode it sits below 3:1
  // against every surface tier, and in every mode it vanishes against the
  // bright-orange hover fill of primary controls (orange on orange) and
  // reads weakly on the neutral orange fill and the fg2 header band. So this
  // treatment is NOT accessibility-compliant and makes no such claim. Per
  // direction there is no compensating second ring and no substitute color:
  // every focus rule below draws this one 1px line and nothing else.
  const focusColor = palette.bright_orange;

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
        ...roles.accents.orange,
      },
      secondary: {
        // Structural chrome from the mode-appropriate fg family (fg2 base):
        // cream fill in dark mode, charcoal-brown fill in light mode. See
        // ContrastRoles.secondary.
        ...roles.secondary,
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
        ...roles.accents.blue,
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
      // Heading variants read as instrument labels on a mainframe console:
      // compact sizes, tight leading, bold for the top display tier (h1),
      // semibold for the display band and medium for the small instrument
      // labels, with restrained tracking (slightly negative on the largest
      // sizes, near-neutral below).
      // Replaces MUI's huge thin display defaults; Montserrat stays the
      // heading face and Caskaydia the body/terminal face (above).
      h1: { fontFamily: UI_FONT, fontSize: '2.875rem', lineHeight: 1.08, fontWeight: 700, letterSpacing: '-0.01em' },
      h2: { fontFamily: UI_FONT, fontSize: '2.125rem', lineHeight: 1.14, fontWeight: 600, letterSpacing: '-0.005em' },
      h3: { fontFamily: UI_FONT, fontSize: '1.75rem', lineHeight: 1.18, fontWeight: 600, letterSpacing: '0' },
      h4: { fontFamily: UI_FONT, fontSize: '1.5rem', lineHeight: 1.22, fontWeight: 600, letterSpacing: '0' },
      h5: { fontFamily: UI_FONT, fontSize: '1.25rem', lineHeight: 1.26, fontWeight: 500, letterSpacing: '0' },
      h6: { fontFamily: UI_FONT, fontSize: '1.0625rem', lineHeight: 1.28, fontWeight: 500, letterSpacing: '0.01em' },
      subtitle1: { fontFamily: UI_FONT, fontSize: '1rem', lineHeight: 1.4, fontWeight: 600, letterSpacing: '0.01em' },
      subtitle2: { fontFamily: UI_FONT, fontSize: '0.875rem', lineHeight: 1.45, fontWeight: 600, letterSpacing: '0.01em' },
      caption: { fontFamily: UI_FONT },
      // Overline reads as a small instrument tag: compact size, semibold, and
      // the generous letter spacing that tiny uppercase labels need to stay
      // legible; the taller line box keeps the tag from crowding neighbors.
      overline: { fontFamily: UI_FONT, fontSize: '0.75rem', lineHeight: 2, fontWeight: 600, letterSpacing: '0.08em' },
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
            // Residual elevation shadow: MUI paints `theme.shadows[
            // elevation]` on elevation-variant Paper (Cards' internal Paper,
            // plain <Paper> tiles, the color picker's inner sheet) as
            // `box-shadow: var(--Paper-shadow)` inside its root rule — the
            // element's inline style still carries the shadow value in the
            // --Paper-shadow custom property. MUI v9 emits NO separate
            // elevation-variant rule, so a root styleOverride declaration
            // emitted after MUI's `box-shadow: var(--Paper-shadow)` in the
            // same merged rule wins the cascade. This flattens every
            // elevation paper to match the quiet 1px-outline language of
            // the rest of the theme. Only the shadow is removed: the theme's
            // `shadows` array is untouched, no replacement borders or colors
            // are added, and the explicit flat+frame overrides on Popover/
            // Menu/Dialog papers are unchanged — surfaces keep separating
            // through the existing surface tiers and 1px frames.
            boxShadow: 'none',
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
              // MUI's own ToggleButton `standard` variant emits a higher-
              // specificity `&.Mui-selected:hover` that repaints the fill with
              // translucent action.hover ink (selectedOpacity + hoverOpacity of
              // the TEXT color). That alpha wash REPLACES the solid inverse
              // fill: over a pale light-mode page it leaves a near-white fill
              // under the cream label — the label effectively disappears. Pin
              // the selected+hover state to the same solid inverse band, so
              // pointer hover cannot erase the selection in any variant.
              // (Touch-only devices: MUI's own `@media (hover: none)` reset
              // resolves to the resting selected fill, which this rule
              // reproduces exactly, so behavior is unchanged there too.)
              '&:hover': {
                backgroundColor: roles.headerBackground,
                color: roles.headerText,
              },
            },
            '&:focus-visible': { outline: `1px solid ${focusColor}`, outlineOffset: 2 },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 2,
            // Flat theme: no elevation in any state. The root pins rest, and
            // the contained override below pins every state MUI's contained
            // variant elevates (hover, active, keyboard focus, touch, disabled).
            boxShadow: 'none',
            '&:active': { boxShadow: 'none' },
            minHeight: 40,
            fontWeight: 600,
            textTransform: 'none',
            '&:focus-visible': { outline: `1px solid ${focusColor}`, outlineOffset: 2 },
          },
          contained: {
            // No filled/contained Button ever draws a shadow: MUI's contained
            // variant paints shadows[2] at rest, shadows[4] on hover,
            // shadows[8] on active, shadows[6] (composed with any
            // theme.focusVisible shadow) on .Mui-focusVisible, resets to
            // shadows[2] on touch (@media hover: none) and shadows[0] when
            // disabled. Each of those is pinned to none here, in the same
            // merged rule, so the whole state machine is flat while the
            // 1px bright_orange focus outline contract above is untouched
            // (the outline comes from the root focus-visible / ButtonBase
            // .Mui-focusVisible rules and is unaffected by the shadow pins).
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
              '@media (hover: none)': { boxShadow: 'none' },
            },
            '&:active': { boxShadow: 'none' },
            '&.Mui-focusVisible': { boxShadow: 'none' },
            '&.Mui-disabled': { boxShadow: 'none' },
          },
        },
        // Filled fills keep the neutral tone at rest and lift to the bright
        // tier on hover, with a label recomputed for the bright fill — the
        // same highlight treatment the chips use. The frame border that other
        // surfaces use must NOT reach the Button root: text buttons carry no
        // border at all, and outlined borders track the button's text color —
        // the raw neutral swatch at rest (explicit user direction: outlined
        // and text resting ink is the exact resolved `neutral_<accent>`
        // swatch, NOT the readability-adjusted `main` text role; knowingly
        // below 4.5:1 against the surfaces in some variants, accepted) and
        // the recomputed hover ink on hover (see the outlined hover variants
        // below). Color rules ship as variants:
        // this MUI version restricts styleOverrides keys to ButtonClasses,
        // which no longer contains the color-specific keys.
        variants: [
          ...BUTTON_COLORS.map((color) => {
            const accent = colorRoles(color, roles);
            return {
              props: { color },
              style: {
                // RESTING outlined/text ink: the RAW neutral swatch
                // (`accent.neutralFill` — the exact `neutral_<accent>` user
                // swatch for accents, the fg2 swatch for secondary), not the
                // readability-adjusted `main` text role MUI would otherwise
                // put in these two custom properties. This contrast may fall
                // below 4.5:1 against the page and paper in some variants —
                // explicitly accepted by user direction; no substitute
                // blended color is used. `palette[color].main` itself is
                // untouched and keeps driving links, icons and every other
                // component that reads the accent text role.
                '--variant-textColor': accent.neutralFill,
                '--variant-outlinedColor': accent.neutralFill,
                // Outlined border tracks the resting ink — the same raw
                // neutral swatch. On hover the border moves to the hover ink
                // (see the outlined hover variants below).
                '--variant-outlinedBorder': accent.neutralFill,
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
                  backgroundColor: colorRoles(color, roles).light,
                  color: colorRoles(color, roles).lightContrastText,
                },
              },
            },
          })),
          // Outlined buttons share the same highlight contract as the filled
          // and hover tiers: pointer hover lifts the whole button to the
          // bright tier with the label recomputed for that fill — a solid,
          // unmistakable highlight instead of MUI's faint translucent wash
          // (alpha(main, hoverOpacity), near-invisible on these surfaces).
          // The palette-native pairing: the fill is the exact `bright_<hue>`
          // swatch; the ink is the same `lightContrastText` role the
          // contained hover and filled chips already use — an exact named
          // swatch (bg0_hard) in dark mode, and in light mode the pre-existing
          // computed near-black label ink (no named swatch reaches 4.5:1 on
          // the bright tiers there — verified against every resolved swatch;
          // see lightContrastText/readableLabel). The border keeps tracking
          // the button's text color, so on hover it moves to the hover ink
          // with the label. Touch devices never match (the rule is inside
          // @media (hover: hover), matching MUI's own convention), so they
          // keep the rest state below.
          ...BUTTON_COLORS.map((color) => ({
            props: { variant: 'outlined' as const, color },
            style: {
              // REST FILL: by explicit user direction, the outlined Button
              // rests on the exact resolved `bg0` palette swatch in BOTH
              // modes — NOT the per-contrast `roles.background`/`roles.paper`
              // (soft/hard page backgrounds use `bg0_soft`/`bg0_hard`, which
              // are other shades). The raw neutral resting ink and border
              // above are untouched, and the strong bright-tier hover fill
              // below still wins over this rest declaration through its
              // `:hover` rule inside @media (hover: hover). Touch devices
              // never match the hover rule, so they keep this rest fill.
              // Disabled outlined buttons also pick this fill up (MUI's
              // disabled outlined rule repaints only color and border); their
              // ink/border/interactivity are unchanged — an accepted, reported
              // consequence of the generic rest fill in both modes.
              backgroundColor: palette.bg0,
              '@media (hover: hover)': {
                '&:hover': {
                  backgroundColor: colorRoles(color, roles).light,
                  color: colorRoles(color, roles).lightContrastText,
                  '--variant-outlinedBorder': colorRoles(color, roles).lightContrastText,
                },
              },
            },
          })),
          // Same exact-swatch rest fill for `inherit` outlined buttons, in
          // BOTH modes (`bg0`) — but through MUI's OWN
          // consumption mechanism, not a direct fill: MUI's base outlined
          // rule paints `background-color: var(--variant-outlinedBg)`, and
          // MUI's inherit hover rule repaints that same custom property on
          // hover (the pre-existing text-primary alpha wash). A direct
          // `backgroundColor` here would REPLACE the var-based declaration
          // in the merged root rule and permanently mask the hover wash —
          // the custom property would update with no consumer (verified
          // against the emitted CSS: merged rest rule carried only the
          // direct hex; the hover rule set the var into a rule nothing
          // read). Declaring the var at rest keeps both states: rest
          // resolves to the exact mode swatch, and on hover MUI's `:hover`
          // rule — the same merged class chain plus a `:hover` pseudo-class,
          // strictly higher specificity — wins the var and restores the
          // stock inherit hover.
          {
            props: { variant: 'outlined' as const, color: 'inherit' as const },
            style: { '--variant-outlinedBg': palette.bg0 },
          },
        ],
      },
      MuiButtonBase: {
        styleOverrides: {
          root: {
            '&.Mui-focusVisible': { outline: `1px solid ${focusColor}`, outlineOffset: 2 },
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
            '&:focus-visible': { outline: `1px solid ${focusColor}`, outlineOffset: 2 },
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
            '&:focus-visible': { outline: `1px solid ${focusColor}`, outlineOffset: 1 },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          notchedOutline: { borderWidth: 1, borderColor: roles.frame },
          // Hover keeps the outlined boundary on the shared 1px frame role:
          // MUI repaints the notch in full text ink on hover. Focused inputs
          // are excluded so the focus ring stays the exact 1px bright_orange
          // swatch in the hover+focus state, and error inputs are excluded so
          // MUI's own error boundary keeps governing (it wins over MUI's
          // hover by rule order). Touch devices do not hover, so the rest
          // notch above is the state they see.
          root: {
            fontFamily: UI_FONT,
            borderRadius: 2,
            '&:hover:not(.Mui-focused):not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
              borderColor: roles.frame,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 1,
              borderColor: focusColor,
            },
          },
        },
      },
      MuiInput: {
        styleOverrides: {
          root: {
            // Standard/underline inputs are ordinary UI controls, so they
            // carry the same Montserrat chrome stack as Outlined and Filled
            // inputs (both set explicitly in this file). Without this, MUI's
            // default `font: inherit` pulls the base body stack (Caskaydia)
            // into the standard variant only, and the three variants
            // disagree. Terminal and data readouts are not MuiInput
            // components — they keep their explicit Caskaydia styling in the
            // app — and the base body stack above stays Caskaydia, so body
            // text is unaffected.
            fontFamily: UI_FONT,
            // Boundary contract: the enabled, non-error underline rests on
            // the shared 1px frame role (fg2) — replacing MUI's translucent
            // rgba line — and STAYS 1px frame on pointer hover, where MUI
            // switches to a 2px full-ink underline. Error inputs keep MUI's
            // own error-colored boundary (the hover rule excludes them) and
            // disabled keeps MUI's dotted treatment (excluded); the focus
            // line below stays the exact 1px bright_orange swatch. Touch
            // devices match the rest state: no hover fires, and the rest
            // line above is the same 1px frame.
            '&::before': { borderBottomColor: roles.frame },
            '&:hover:not(.Mui-disabled):not(.Mui-error)::before': {
              borderBottom: `1px solid ${roles.frame}`,
            },
          },
          underline: {
            '&:after': { borderBottomWidth: 1, borderBottomColor: focusColor },
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
              // resting input) and the border takes the shared focus
              // treatment — the exact bright_orange swatch (see focusColor
              // above). That border is knowingly low-contrast against the
              // lifted fill and the surrounding paper in the light variants
              // (explicit user direction; no substitute color or second
              // ring).
              backgroundColor: roles.inputHover,
              borderColor: focusColor,
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
            // Expanded keeps only the taller row: no interior border — the
            // 1px frame at the accordion root is the single boundary (see
            // MuiAccordion below).
            '&.Mui-expanded': { minHeight: 44 },
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
            // Consistent 1px outside frame in the shared border role — the
            // same tone every other framed surface uses (outlined Paper, Chip,
            // Alert, Dialog, Popover, FilledInput): the fg2 swatch, which
            // reads as cream in dark mode. The interior stays borderless —
            // the expanded summary carries no divider — MUI's own ::before
            // separator stays hidden and no shadow is drawn.
            border: `1px solid ${roles.frame}`,
            boxShadow: 'none',
            '&:before': { display: 'none' },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontFamily: UI_FONT,
            borderRadius: 2,
            // NO standing border on any filled chip (including the default
            // color chip): the fill carries the chip, and a frame stroke
            // around a solid fill read as double boundary. The root-level
            // frame border the theme used to draw here was removed; chips
            // that want a boundary get one only through the outlined
            // variants below, pinned to the chip's EFFECTIVE TEXT color.
            // Filled color chips follow the button fill model: the raw
            // neutral swatch at rest with its own label ink, the bright tier
            // on hover (wrapped like the buttons). MUI does not emit combined
            // `filledPrimary`-style classes — the color and the fill variant
            // are two separate classes on the root — so each selector names
            // both and out-specifies MUI's own color fill (which paints the
            // readability-adjusted `main`, a text role, into a fill).
            '&.MuiChip-colorPrimary.MuiChip-filled': {
              backgroundColor: roles.accents.orange.neutralFill, color: roles.accents.orange.neutralFillLabel,
              '@media (hover: hover)': {
                '&:hover': { backgroundColor: roles.accents.orange.light, color: roles.accents.orange.lightContrastText },
              },
            },
            '&.MuiChip-colorSecondary.MuiChip-filled': {
              backgroundColor: roles.secondary.neutralFill, color: roles.secondary.neutralFillLabel,
              '@media (hover: hover)': {
                '&:hover': { backgroundColor: roles.secondary.light, color: roles.secondary.lightContrastText },
              },
            },
            '&.MuiChip-colorError.MuiChip-filled': {
              backgroundColor: roles.accents.red.neutralFill, color: roles.accents.red.neutralFillLabel,
              '@media (hover: hover)': {
                '&:hover': { backgroundColor: roles.accents.red.light, color: roles.accents.red.lightContrastText },
              },
            },
            '&.MuiChip-colorWarning.MuiChip-filled': {
              backgroundColor: roles.accents.yellow.neutralFill, color: roles.accents.yellow.neutralFillLabel,
              '@media (hover: hover)': {
                '&:hover': { backgroundColor: roles.accents.yellow.light, color: roles.accents.yellow.lightContrastText },
              },
            },
            '&.MuiChip-colorSuccess.MuiChip-filled': {
              backgroundColor: roles.accents.green.neutralFill, color: roles.accents.green.neutralFillLabel,
              '@media (hover: hover)': {
                '&:hover': { backgroundColor: roles.accents.green.light, color: roles.accents.green.lightContrastText },
              },
            },
            '&.MuiChip-colorInfo.MuiChip-filled': {
              backgroundColor: roles.accents.blue.neutralFill, color: roles.accents.blue.neutralFillLabel,
              '@media (hover: hover)': {
                '&:hover': { backgroundColor: roles.accents.blue.light, color: roles.accents.blue.lightContrastText },
              },
            },
          },
        },
        // Outlined (hollow) chips keep a 1px boundary, and that boundary is
        // `currentColor` — the chip's ACTUAL computed text color, whatever it
        // is: MUI's own outlined ink rule, a consumer `sx` color override, or
        // anything else. This replaces both MUI's defaults (which soften the
        // border: alpha(main, 0.7) on color chips, a grey default border on
        // default chips) and the former per-color literal hex pins, so border
        // and ink can never drift apart. The pins hold in every state without
        // extra rules:
        // - clickable: MUI's hover/focus washes only repaint the fill, never
        //   the root ink or border.
        // - deletable: only the delete icon's own color changes.
        // - disabled: MUI dims the whole root with `opacity:
        //   action.disabledOpacity`, so border and text composite identically
        //   and stay equal.
        // The per-color repetitions below exist solely to out-specify MUI's
        // built-in outlined+color border rule (same two-class selector shape,
        // later emission); they carry the same `currentColor` value, so a
        // consumer color override still rules both ink and border.
        variants: [
          { props: { variant: 'outlined' as const }, style: { border: '1px solid currentColor' } },
          ...BUTTON_COLORS.map((color) => ({
            props: { variant: 'outlined' as const, color },
            style: { border: '1px solid currentColor' },
          })),
        ],
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            border: `1px solid ${roles.frame}`,
            borderRadius: 2,
            // Filled alerts carry the raw neutral swatch with its own label
            // ink — the fill role, not the readability-adjusted text role.
            // MUI emits `MuiAlert-colorX` and `MuiAlert-filled` as separate
            // classes, so the selector names both; three classes out-specify
            // MUI's own filled fill (the darker tier with a bare black ink).
            '&.MuiAlert-colorError.MuiAlert-filled': { backgroundColor: roles.accents.red.neutralFill, color: roles.accents.red.neutralFillLabel },
            '&.MuiAlert-colorWarning.MuiAlert-filled': { backgroundColor: roles.accents.yellow.neutralFill, color: roles.accents.yellow.neutralFillLabel },
            '&.MuiAlert-colorSuccess.MuiAlert-filled': { backgroundColor: roles.accents.green.neutralFill, color: roles.accents.green.neutralFillLabel },
            '&.MuiAlert-colorInfo.MuiAlert-filled': { backgroundColor: roles.accents.blue.neutralFill, color: roles.accents.blue.neutralFillLabel },
            // Standard alerts: palette-native named pairs — dark fills
            // `bg0_hard` with the `bright_` same-hue swatch, light fills
            // `bg0` with the `deep_` same-hue swatch on the rev-25 defaults
            // (verified at full WCAG precision across all six variants,
            // including the icon's 0.9 opacity composite). `standardAlert-
            // Treatment` walks all same-hue named tiers across the named
            // alert-fill surfaces and, for degenerate palettes with no
            // passing pair, selects the best available same-hue named pair
            // (explicitly accepted by user decision; never presented as
            // passing). No custom blends, no MUI-stock fallback. Outlined
            // and filled variants are NOT
            // overridden here: outlined keeps its transparent surface and
            // accent ink, filled keeps the neutral-fill blocks above.
            ...Object.entries(ALERT_SEVERITY_ACCENT).map(([severity, accentName]) => [
              `&.MuiAlert-standard.MuiAlert-color${severity[0].toUpperCase()}${severity.slice(1)}`,
              (() => {
                const treatment = standardAlertTreatment(palette, mode, accentName);
                return {
                  backgroundColor: treatment.fill,
                  color: treatment.ink,
                  '& .MuiAlert-icon': { color: treatment.ink },
                };
              })(),
            ] as const).reduce<Record<string, unknown>>((acc, [selector, style]) => {
              acc[selector] = style;
              return acc;
            }, {}),
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
      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            // SnackbarContent is a Paper subclass: Round 8's flat-Paper
            // treatment already removed its shadow and set its radius, but
            // MUI's stock fill is `emphasize(background.default, 0.98)` —
            // a near-white block in dark mode and a near-black block in
            // light mode — with no frame, which strands both outside the
            // palette and leaves the toast unseparated once shadows are
            // gone. Draw it on the same trio the rest of the theme uses:
            // the paper surface tier, the ordinary text ink, and the 1px
            // frame. No typography override: MUI's body2 stack stays.
            // Message, action and close controls inherit or keep their own
            // themed ink (asserted in snackbarContent.test.tsx across all
            // six variants; sampled custom palettes only — no universal
            // custom-palette guarantee and no WCAG compliance claim).
            backgroundColor: roles.paper,
            color: roles.text,
            border: `1px solid ${roles.frame}`,
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
