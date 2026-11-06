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
      expect(hard.palette.divider).not.toBe(medium.palette.divider);
      expect(soft.palette.primary.main).not.toBe(medium.palette.primary.main);
      expect(hard.palette.primary.main).not.toBe(medium.palette.primary.main);
      expect(medium.palette.primary.main).toBe(mediumRoles.accents.blue.main);
      expect(palette).toEqual(original);

      for (const [index, theme] of themes.entries()) {
        const roles = getContrastRoles(palette, mode, CONTRASTS[index]);
        expect(theme.palette.background.paper).toBe(roles.paper);
        expect(theme.palette.divider).toBe(roles.divider);
        expect(theme.palette.primary.contrastText).toBe(roles.accents.blue.contrastText);
        expect(theme.components?.MuiButton?.styleOverrides).toMatchObject({
          // The frame border belongs to surfaces, not buttons: the Button root
          // must not carry it. Its shared focus-visible accent is expected.
          root: { '&:focus-visible': { outline: `1px solid ${roles.accents.blue.main}` } },
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
        // Interior sections and ordinary icon actions are quiet: no frames.
        expect((theme.components?.MuiAccordion?.styleOverrides?.root as Record<string, unknown>).border).toBeUndefined();
        expect((theme.components?.MuiIconButton?.styleOverrides?.root as Record<string, unknown>).border).toBeUndefined();
        // Filled inputs keep a visible boundary at rest and an obvious
        // keyboard-focus treatment: fill lifts to the hover tier and the
        // border takes the independent blue focus accent. The accent must
        // clear 3:1 (WCAG 1.4.11 non-text) against the actual focused
        // surfaces — the lifted fill and the surrounding paper.
        const filledRoot = theme.components?.MuiFilledInput?.styleOverrides?.root as Record<string, Record<string, string>>;
        expect(filledRoot.border).toBe(`1px solid ${roles.frame}`);
        const focusedFilled = filledRoot['&.Mui-focused'];
        expect(focusedFilled.backgroundColor).toBe(roles.inputHover);
        expect(focusedFilled.borderColor).toBe(roles.accents.blue.main);
        expect(focusedFilled.borderColor).not.toBe(roles.frame);
        expect(getContrastRatio(roles.accents.blue.main, roles.inputHover), `${mode} ${CONTRASTS[index]} focus border vs filled fill`).toBeGreaterThanOrEqual(3);
        expect(getContrastRatio(roles.accents.blue.main, roles.paper), `${mode} ${CONTRASTS[index]} focus border vs paper`).toBeGreaterThanOrEqual(3);
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
        expect(output).toContain(`"main": "${roles.accents.blue.main}"`);
        expect(output).toContain(`"contrastText": "${roles.accents.blue.contrastText}"`);
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
      neutral_blue: '#648fa2',
      bright_blue: '#91b8c4',
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
    expect(theme.palette.primary.main).toBe(roles.accents.blue.main);
    expect(theme.palette.primary.main).not.toBe(DARK_DEFAULTS.bright_blue);
    expect(serializeMuiTheme(modePalettes)).toContain(`"main": "${roles.accents.blue.main}"`);
  });
});

// ── Hover/highlight behavior ─────────────────────────────────
// Filled fills rest on the neutral-tier main and lift to the bright tier on
// hover, with a label ink recomputed for the bright fill. Coverage spans all
// six variants (both modes × all contrasts) and every semantic accent, and
// checks the actual hover foreground/background pair — not just the page.

type AccentKey = 'blue' | 'purple' | 'red' | 'yellow' | 'green' | 'aqua' | 'orange';

const SEMANTIC_ACCENTS: { name: AccentKey; chipClass: string; buttonColor: string }[] = [
  { name: 'blue', chipClass: '&.MuiChip-filledPrimary', buttonColor: 'primary' },
  { name: 'purple', chipClass: '&.MuiChip-filledSecondary', buttonColor: 'secondary' },
  { name: 'red', chipClass: '&.MuiChip-filledError', buttonColor: 'error' },
  { name: 'yellow', chipClass: '&.MuiChip-filledWarning', buttonColor: 'warning' },
  { name: 'green', chipClass: '&.MuiChip-filledSuccess', buttonColor: 'success' },
  { name: 'aqua', chipClass: '&.MuiChip-filledInfo', buttonColor: 'info' },
];

describe('hover and highlight behavior', () => {
  for (const { mode, palette } of MODES) {
    for (const contrast of CONTRASTS) {
      it(`rests on neutral and lifts to bright with passing contrast in ${mode}/${contrast}`, () => {
        const theme = buildMuiTheme(palette, mode, contrast);
        const roles = getContrastRoles(palette, mode, contrast);
        const components = theme.components as Record<string, { styleOverrides?: Record<string, unknown>; variants?: unknown }>;

        const buttonVariants = (components.MuiButton?.variants ?? []) as Array<{
          props?: { variant?: string; color?: string };
          style?: Record<string, unknown>;
        }>;

        for (const { name, chipClass, buttonColor } of SEMANTIC_ACCENTS) {
          const accent = roles.accents[name];
          const chipStyle = (components.MuiChip?.styleOverrides?.root ?? {}) as Record<string, Record<string, Record<string, string>>>;
          const chipRest = chipStyle[chipClass];
          const chipHover = chipRest?.['&:hover'];
          const buttonHover = (buttonVariants.find((variant) =>
            variant.props?.variant === 'contained' && variant.props?.color === buttonColor)
            ?.style?.['@media (hover: hover)'] as Record<string, Record<string, string>> | undefined)?.['&:hover'];

          // The resting fill is the readable neutral main — never the bright tier.
          expect(chipRest?.backgroundColor, `${mode}/${contrast} ${name} chip rest`).toBe(accent.main);
          expect(accent.main).not.toBe(accent.light);

          // Hover lifts to the bright tier with the recomputed label ink.
          expect(chipHover?.backgroundColor, `${mode}/${contrast} ${name} chip hover bg`).toBe(accent.light);
          expect(chipHover?.color, `${mode}/${contrast} ${name} chip hover ink`).toBe(accent.lightContrastText);
          expect(buttonHover?.backgroundColor, `${mode}/${contrast} ${name} button hover bg`).toBe(accent.light);
          expect(buttonHover?.color, `${mode}/${contrast} ${name} button hover ink`).toBe(accent.lightContrastText);

          // The actual hover foreground/background pair passes 4.5:1, and the
          // resting fill keeps its own accessible label.
          expect(getContrastRatio(accent.lightContrastText, accent.light), `${mode}/${contrast} ${name} hover pair`).toBeGreaterThanOrEqual(4.5);
          expect(getContrastRatio(accent.contrastText, accent.main), `${mode}/${contrast} ${name} rest pair`).toBeGreaterThanOrEqual(4.5);
        }

        // Selection shares the highlight treatment on the primary accent.
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

        // Focus is outline-only — a different, non-fill treatment.
        expect(selected?.backgroundColor).not.toBe(roles.accents.blue.main);
        expect(toggle['&:focus-visible']?.outline).toContain(roles.accents.blue.main);
      });
    }
  }
});
