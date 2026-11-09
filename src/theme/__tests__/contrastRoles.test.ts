import { describe, expect, it } from 'vitest';
import { getContrastRatio } from '@mui/material/styles';
import {
  DARK_DEFAULTS,
  DEFAULT_DARK_BASE_COLORS,
  DEFAULT_LIGHT_BASE_COLORS,
  LIGHT_DEFAULTS,
} from '../../palette/defaults';
import { serializeMuiTheme } from '../../palette/serializers/mui-serializer';
import type { Contrast, Mode, ModePalettes, ResolvedPalette } from '../../palette/types';
import { resolvePalette } from '../../palette/resolver';
import { buildMuiTheme } from '../buildMuiTheme';
import { getContrastRoles } from '../contrastRoles';
import { createSunfadeThemeOptions } from '../sunfadeTheme';

const CONTRASTS: Contrast[] = ['soft', 'medium', 'hard'];
const MODES: { mode: Mode; palette: ResolvedPalette }[] = [
  { mode: 'dark', palette: DARK_DEFAULTS },
  { mode: 'light', palette: LIGHT_DEFAULTS },
];

const DEFAULT_MODE_PALETTES: ModePalettes = {
  dark: { baseColors: { ...DEFAULT_DARK_BASE_COLORS }, overrides: {} },
  light: { baseColors: { ...DEFAULT_LIGHT_BASE_COLORS }, overrides: {} },
};

describe('contrast presentation', () => {
  for (const { mode, palette } of MODES) {
    it(`changes the full theme in ${mode} mode without changing palette swatches`, () => {
      const original = { ...palette };
      const themes = CONTRASTS.map((contrast) => buildMuiTheme(palette, mode, contrast));
      const [soft, medium, hard] = themes;
      const mediumRoles = getContrastRoles(palette, mode, 'medium');

      expect(themes.map((theme) => theme.palette.background.default))
        .toEqual([palette.bg0_soft, palette.bg0, palette.bg0_hard]);
      expect(themes.map((theme) => theme.palette.text.primary))
        .toEqual([palette.fg2, palette.fg1, palette.fg0]);
      expect(soft.palette.background.paper).toBe(palette.bg1);
      expect(hard.palette.background.paper).toBe(palette.bg2);
      // Dividers share the themed border color (the frame tone, always the fg2
      // swatch) in every contrast — they must not fall back to bg tiers.
      expect(hard.palette.divider).toBe(medium.palette.divider);
      expect(soft.palette.divider).toBe(medium.palette.divider);
      expect(soft.palette.divider).toBe(palette.fg2);
      expect(soft.palette.primary.main).not.toBe(medium.palette.primary.main);
      expect(hard.palette.primary.main).not.toBe(medium.palette.primary.main);
      expect(medium.palette.primary.main).toBe(mediumRoles.accents.orange.main);
      // Secondary is fg-family chrome: the raw fill is the fg2 swatch and the
      // readable text role adjusts only if an edited fg2 loses readability.
      expect(medium.palette.secondary.main).toBe(mediumRoles.secondary.main);
      expect(mediumRoles.secondary.neutralFill).toBe(palette.fg2);
      expect(mediumRoles.secondary.main).not.toBe(mediumRoles.secondary.light);
      expect(medium.palette.info.main).toBe(mediumRoles.accents.blue.main);
      expect(palette).toEqual(original);

      for (const [index, theme] of themes.entries()) {
        const roles = getContrastRoles(palette, mode, CONTRASTS[index]);
        expect(theme.palette.background.paper).toBe(roles.paper);
        expect(theme.palette.divider).toBe(roles.divider);
        // Divider lines always carry the themed border color (the frame tone),
        // which is also what MUI paints ToggleButton borders with.
        expect(roles.divider).toBe(roles.frame);
        expect(theme.palette.primary.contrastText).toBe(roles.accents.orange.contrastText);
        expect(theme.components?.MuiButton?.styleOverrides).toMatchObject({
          // The frame border belongs to surfaces, not buttons: the Button root
          // must not carry it. Its shared focus-visible treatment is the exact
          // bright_orange palette swatch (explicit user direction).
          root: { '&:focus-visible': { outline: `1px solid ${palette.bright_orange}` } },
        });
        // Default cards are quiet paper surfaces: no standing frame. The
        // explicitly outlined Paper/Card variant keeps its 1px frame.
        expect(theme.components?.MuiCard?.styleOverrides).toMatchObject({
          root: { boxShadow: 'none' },
        });
        expect((theme.components?.MuiCard?.styleOverrides?.root as Record<string, unknown>).border).toBeUndefined();
        expect(theme.components?.MuiPaper?.styleOverrides).toMatchObject({
          root: { borderColor: roles.frame },
          outlined: { borderWidth: 1 },
        });
        // Interior sections carry the shared 1px frame (cream in dark mode);
        // ordinary icon actions stay quiet with no frames.
        expect((theme.components?.MuiAccordion?.styleOverrides?.root as Record<string, unknown>).border).toBe(`1px solid ${roles.frame}`);
        expect((theme.components?.MuiIconButton?.styleOverrides?.root as Record<string, unknown>).border).toBeUndefined();
        // Filled inputs keep a visible boundary at rest and an obvious
        // keyboard-focus treatment: the fill lifts to the hover tier and the
        // border takes the shared focus treatment — the exact bright_orange
        // swatch (explicit user direction). No non-text contrast floor is
        // asserted for that border: bright_orange sits below 3:1 against the
        // lifted fill and the paper in the light variants, a trade-off the
        // user accepted; no WCAG claim is made for the focus indicator.
        const filledRoot = theme.components?.MuiFilledInput?.styleOverrides?.root as Record<string, Record<string, string>>;
        expect(filledRoot.border).toBe(`1px solid ${roles.frame}`);
        const focusedFilled = filledRoot['&.Mui-focused'];
        expect(focusedFilled.backgroundColor).toBe(roles.inputHover);
        expect(focusedFilled.borderColor).toBe(palette.bright_orange);
        expect(focusedFilled.borderColor).not.toBe(roles.frame);
        // The lifted focused fill keeps its label readable (the input text
        // sits on the fill while focused).
        expect(getContrastRatio(roles.text, roles.inputHover), `${mode} ${CONTRASTS[index]} text on focused fill`).toBeGreaterThanOrEqual(4.5);
        expect(theme.components?.MuiTooltip?.styleOverrides).toMatchObject({
          tooltip: { border: `1px solid ${roles.frame}` },
        });
        expect(theme.components?.MuiPopover?.styleOverrides).toMatchObject({
          paper: { border: `1px solid ${roles.frame}` },
        });
        expect(theme.components?.MuiDialog?.styleOverrides).toMatchObject({
          paper: { border: `1px solid ${roles.frame}` },
        });
        expect(getContrastRatio(theme.palette.text.primary, theme.palette.background.default)).toBeGreaterThan(4.5);
        expect(getContrastRatio(theme.palette.text.primary, theme.palette.background.paper)).toBeGreaterThan(4.5);

        for (const [name, accent] of Object.entries(roles.accents)) {
          expect(getContrastRatio(accent.contrastText, accent.main), `${mode} ${CONTRASTS[index]} ${name} label`).toBeGreaterThanOrEqual(4.5);
          expect(getContrastRatio(accent.main, roles.background), `${mode} ${CONTRASTS[index]} ${name} page`).toBeGreaterThanOrEqual(4.5);
          expect(getContrastRatio(accent.main, roles.paper), `${mode} ${CONTRASTS[index]} ${name} paper`).toBeGreaterThanOrEqual(4.5);
        }
      }

      expect(soft.palette.terminalHeader.background).toBe(palette.fg2);
      expect(soft.palette.terminalHeader.text).toBe(palette.bg0_hard);
      expect(getContrastRatio(soft.palette.terminalHeader.text, soft.palette.terminalHeader.background)).toBeGreaterThanOrEqual(4.5);
      expect(soft.shape.borderRadius).toBe(2);
      expect(soft.components?.MuiPopover?.styleOverrides).toMatchObject({
        paper: { border: `1px solid ${getContrastRoles(palette, mode, 'soft').frame}` },
      });
    });

    it(`exports the same contrast roles shown in the ${mode} preview`, () => {
      const baseColors = mode === 'dark' ? DEFAULT_DARK_BASE_COLORS : DEFAULT_LIGHT_BASE_COLORS;
      // The defaults must round-trip through the resolver so the export (built
      // from base colors) matches the preview (built from DARK/LIGHT_DEFAULTS).
      expect(resolvePalette({ baseColors: { ...baseColors }, overrides: {}, mode, contrast: 'medium' })).toEqual(palette);

      const output = serializeMuiTheme(DEFAULT_MODE_PALETTES);
      for (const contrast of CONTRASTS) {
        const roles = getContrastRoles(palette, mode, contrast);
        expect(output).toContain(`"default": "${roles.background}"`);
        expect(output).toContain(`"paper": "${roles.paper}"`);
        expect(output).toContain(`"primary": "${roles.text}"`);
        expect(output).toContain(`"secondary": "${roles.secondaryText}"`);
        expect(output).toContain(`"divider": "${roles.divider}"`);
        // Primary is the orange accent, info the blue accent, secondary the
        // fg-family chrome — all three roles must appear in the export.
        expect(output).toContain(`"main": "${roles.accents.orange.main}"`);
        expect(output).toContain(`"main": "${roles.accents.blue.main}"`);
        expect(output).toContain(`"main": "${roles.secondary.main}"`);
        expect(output).toContain(`"contrastText": "${roles.accents.orange.contrastText}"`);
        expect(output).toContain(`"backgroundColor": "${roles.inputHover}"`);
        expect(output).toContain(`"background": "${roles.headerBackground}"`);
        expect(output).toContain(`"border": "1px solid ${roles.frame}"`);
        expect(output).toContain('"borderRadius": 2');
        // Every single-line rule in the export is a 1px rule: no 2px borders
        // and no double-line frames anywhere.
        expect(output).not.toMatch(/[23]px (?:solid|double)/);
      }
    });
  }

  it('derives contrast colors from edited bases and overrides', () => {
    const overrides = {
      bg0: '#242f38',
      bg0_soft: '#303e47',
      bg0_hard: '#19252d',
      bg1: '#394953',
      fg0: '#f6f1e8',
      fg2: '#c9c3b7',
      neutral_orange: '#c98a52',
      bright_orange: '#f0a468',
    };
    const modePalettes: ModePalettes = {
      dark: { baseColors: { ...DEFAULT_DARK_BASE_COLORS }, overrides },
      light: { baseColors: { ...DEFAULT_LIGHT_BASE_COLORS }, overrides: {} },
    };
    const resolved = resolvePalette({ baseColors: { ...DEFAULT_DARK_BASE_COLORS }, overrides, mode: 'dark', contrast: 'hard' });
    const roles = getContrastRoles(resolved, 'dark', 'hard');
    const theme = buildMuiTheme(resolved, 'dark', 'hard');

    expect(theme.palette.background.default).toBe(resolved.bg0_hard);
    expect(theme.palette.text.primary).toBe(resolved.fg0);
    // Primary follows the edited orange accent's readable text role.
    expect(theme.palette.primary.main).toBe(roles.accents.orange.main);
    expect(theme.palette.primary.main).not.toBe(DARK_DEFAULTS.bright_orange);
    // Secondary keeps the raw fg-family fill even when fg2 is edited.
    expect(theme.palette.secondary.main).toBe(roles.secondary.main);
    expect(roles.secondary.neutralFill).toBe(resolved.fg2);
    expect(serializeMuiTheme(modePalettes)).toContain(`"main": "${roles.accents.orange.main}"`);
  });
});

// ── Hover/highlight behavior ─────────────────────────────────
// Filled fills rest on the raw neutral fill and lift to the bright tier on
// hover, with a label ink recomputed for the bright fill. Coverage spans all
// six variants (both modes × all contrasts) and every MUI color — the five
// accent-mapped ones plus secondary's fg-family chrome — and checks the
// actual hover foreground/background pair, not just the page.

const MUI_COLORS: {
  label: string;
  pick: (roles: ReturnType<typeof getContrastRoles>) => { neutralFill: string; neutralFillLabel: string; light: string; lightContrastText: string; main: string; contrastText: string };
  chipClass: string;
  buttonColor: string;
}[] = [
  { label: 'primary (orange accent)', pick: (roles) => roles.accents.orange, chipClass: '&.MuiChip-colorPrimary.MuiChip-filled', buttonColor: 'primary' },
  { label: 'secondary (fg chrome)', pick: (roles) => roles.secondary, chipClass: '&.MuiChip-colorSecondary.MuiChip-filled', buttonColor: 'secondary' },
  { label: 'error (red accent)', pick: (roles) => roles.accents.red, chipClass: '&.MuiChip-colorError.MuiChip-filled', buttonColor: 'error' },
  { label: 'warning (yellow accent)', pick: (roles) => roles.accents.yellow, chipClass: '&.MuiChip-colorWarning.MuiChip-filled', buttonColor: 'warning' },
  { label: 'success (green accent)', pick: (roles) => roles.accents.green, chipClass: '&.MuiChip-colorSuccess.MuiChip-filled', buttonColor: 'success' },
  { label: 'info (blue accent)', pick: (roles) => roles.accents.blue, chipClass: '&.MuiChip-colorInfo.MuiChip-filled', buttonColor: 'info' },
];

describe('hover and highlight behavior', () => {
  for (const { mode, palette } of MODES) {
    for (const contrast of CONTRASTS) {
      it(`rests on the raw neutral fill and lifts to bright with passing contrast in ${mode}/${contrast}`, () => {
        const theme = buildMuiTheme(palette, mode, contrast);
        const roles = getContrastRoles(palette, mode, contrast);
        const components = theme.components as Record<string, { styleOverrides?: Record<string, unknown>; variants?: unknown }>;

        const buttonVariants = (components.MuiButton?.variants ?? []) as Array<{
          props?: { variant?: string; color?: string };
          style?: Record<string, unknown>;
        }>;

        for (const { label, pick, chipClass, buttonColor } of MUI_COLORS) {
          const tier = pick(roles);
          const chipStyle = (components.MuiChip?.styleOverrides?.root ?? {}) as Record<string, Record<string, Record<string, Record<string, string>>>>;
          const chipRest = chipStyle[chipClass];
          const chipHover = chipRest?.['@media (hover: hover)']?.['&:hover'];
          const buttonHover = (buttonVariants.find((variant) =>
            variant.props?.variant === 'contained' && variant.props?.color === buttonColor)
            ?.style?.['@media (hover: hover)'] as Record<string, Record<string, string>> | undefined)?.['&:hover'];

          // The resting fill is the RAW neutral fill — never the bright tier,
          // never the readability-adjusted text role.
          expect(chipRest?.backgroundColor, `${mode}/${contrast} ${label} chip rest fill`).toBe(tier.neutralFill);
          expect(tier.neutralFill).not.toBe(tier.light);

          // The rest label is the ink computed for that raw fill, and the
          // pair passes 4.5:1.
          expect(chipRest?.color, `${mode}/${contrast} ${label} chip rest ink`).toBe(tier.neutralFillLabel);
          expect(getContrastRatio(tier.neutralFillLabel, tier.neutralFill), `${mode}/${contrast} ${label} rest pair`).toBeGreaterThanOrEqual(4.5);

          // Hover lifts to the bright tier with the recomputed label ink —
          // identical treatment on chips and buttons.
          expect(chipHover?.backgroundColor, `${mode}/${contrast} ${label} chip hover bg`).toBe(tier.light);
          expect(chipHover?.color, `${mode}/${contrast} ${label} chip hover ink`).toBe(tier.lightContrastText);
          expect(buttonHover?.backgroundColor, `${mode}/${contrast} ${label} button hover bg`).toBe(tier.light);
          expect(buttonHover?.color, `${mode}/${contrast} ${label} button hover ink`).toBe(tier.lightContrastText);
          expect(getContrastRatio(tier.lightContrastText, tier.light), `${mode}/${contrast} ${label} hover pair`).toBeGreaterThanOrEqual(4.5);
        }

        // Selection shares the highlight treatment on the info accent (blue).
        const selection = (components.MuiCssBaseline?.styleOverrides as Record<string, Record<string, string>>)?.['::selection'];
        expect(selection?.backgroundColor).toBe(roles.accents.blue.light);
        expect(selection?.color).toBe(roles.accents.blue.lightContrastText);
        expect(getContrastRatio(roles.accents.blue.lightContrastText, roles.accents.blue.light)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

// ── Single-line design contract ──────────────────────────────
// Every single-line visual element — frames, borders, control outlines
// (including outlined buttons), dividers, and focus outlines — is exactly
// 1 CSS px, and always a single line: no doubled lines as an accent.
// Filled graphical objects (swatches, dots, bands) are not single-line rules
// and are exempt.

describe('single-line design contract', () => {
  for (const { mode, palette } of MODES) {
    for (const contrast of CONTRASTS) {
      it(`uses only 1px single-line rules in ${mode}/${contrast} theme options`, () => {
        const options = createSunfadeThemeOptions(palette, mode, contrast);
        const json = JSON.stringify(options);

        const pxWidths = [...json.matchAll(/"(?:border|outline)[A-Za-z-]*":\s*"([^"]*)"/g)]
          .flatMap((match) => [...match[1].matchAll(/(\d+)px/g)].map((width) => width[1]));
        expect(pxWidths.length, 'expected at least one px-valued line rule').toBeGreaterThan(0);
        expect(new Set(pxWidths), `${mode}/${contrast} line widths`).toEqual(new Set(['1']));
        expect(json).not.toContain('double');
      });
    }
  }
});

// ── Selected-vs-focus independence ───────────────────────────
// Selected toggles are painted with inverse video (the terminalHeader band
// and its own ≥ 4.5:1 label ink). That treatment must differ from the paper
// surface in every one of the six variants — including the cases where the
// input hover tier equals paper — and must not depend on the focus outline.

describe('selected toggle treatment', () => {
  for (const { mode, palette } of MODES) {
    for (const contrast of CONTRASTS) {
      it(`stands out independently of focus in ${mode}/${contrast}`, () => {
        const roles = getContrastRoles(palette, mode, contrast);
        const theme = buildMuiTheme(palette, mode, contrast);
        const toggle = theme.components?.MuiToggleButton?.styleOverrides?.root as Record<string, Record<string, string>>;

        const selected = toggle['&.Mui-selected'];
        expect(selected?.backgroundColor, `${mode}/${contrast} selected fill`).toBe(roles.headerBackground);
        expect(selected?.color, `${mode}/${contrast} selected ink`).toBe(roles.headerText);

        // The selection must not disappear against the paper surface.
        expect(roles.headerBackground).not.toBe(roles.paper);
        expect(getContrastRatio(roles.headerText, roles.headerBackground), `${mode}/${contrast} selected pair`).toBeGreaterThanOrEqual(4.5);

        // Focus is outline-only — a different, non-fill treatment, in the
        // exact bright_orange focus color (explicit user direction).
        expect(selected?.backgroundColor).not.toBe(palette.bright_orange);
        expect(toggle['&:focus-visible']?.outline).toContain(palette.bright_orange);
      });
    }
  }
});
