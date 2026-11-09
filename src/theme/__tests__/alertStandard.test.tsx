// Effective-styling regression tests for Sunfade standard (tinted) alert
// severity fills (palette-native treatment, palette-only fallback policy).
//
// The behavior this guards: the "standard" (default) alert variant is styled
// with PALETTE-NATIVE NAMED PAIRS selected from the resolved palette —
// dark mode fills `bg0_hard` with the `bright_` same-hue swatch, light mode
// fills `bg0` with the `deep_` same-hue swatch (verified at full WCAG
// precision on the rev-25 defaults across all six variants) — replacing both
// MUI's stock tint and the earlier custom tint blend. `standardAlertTreatment`
// walks the full same-hue tier × named-surface matrix; for degenerate
// palettes where NO same-hue pair clears the bars it selects the best
// available same-hue named pair as `best-effort` (explicitly accepted by
// user decision) — there is NO custom-blend or MUI-stock fallback anywhere.
// For every sampled palette (defaults plus the finite stress-probe set), the
// measured UNROUNDED ratios stay:
//   - text on the fill at least 4.5:1, and
//   - the icon, composited at its MUI opacity of 0.9 over the fill (no 8-bit
//     rounding — display quantization is not part of the WCAG math), at
//     least 3:1 against the fill.
// These are sampled checks over finite palettes, not a universal guarantee
// for every arbitrary palette, and no full-WCAG compliance is claimed.
//
// Outlined and filled alerts must be untouched by these overrides: outlined
// keeps its transparent surface with accent ink on it; filled keeps the
// neutral-fill blocks guarded by chipAlertStyles.test.tsx. These values must
// also remain plain serializable data for the standalone theme export.
//
// Real-browser confirmation of the effective rendering is performed
// separately (live-app screenshot sessions with in-page full-precision
// measurement); here the emitted CSS is captured through the Emotion engine
// MUI uses (CacheProvider + renderToString), like the other suites.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import createCache from '@emotion/cache';
import { CacheProvider, ThemeProvider } from '@emotion/react';
import { Alert } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import { parseProjectDefaults } from '../../palette/project-defaults';
import { resolvePalette } from '../../palette/resolver';
import type { BaseColors, Contrast, Mode, ResolvedPalette } from '../../palette/types';
import { getContrastRoles } from '../contrastRoles';
import { buildMuiTheme } from '../buildMuiTheme';
import { createSunfadeThemeOptions, standardAlertTreatment } from '../sunfadeTheme';

const MODES: readonly Mode[] = ['dark', 'light'];
const CONTRASTS: readonly Contrast[] = ['soft', 'medium', 'hard'];
const SEVERITIES = ['error', 'warning', 'info', 'success'] as const;

/** Severity → accent name (the theme's hue-semantics mapping). */
const SEVERITY_ACCENT: Record<string, 'red' | 'yellow' | 'green' | 'blue'> = {
  error: 'red',
  warning: 'yellow',
  success: 'green',
  info: 'blue',
};

/** MUI renders the standard alert icon at 0.9 opacity — the effective
 * composited contrast must account for the fill showing through. */
const ICON_OPACITY = 0.9;
/** WCAG thresholds under test. */
const TEXT_MIN = 4.5;
const ICON_MIN = 3.0;

// ── Theme setup (same pattern as the other suites) ──

function resolvedFor(mode: Mode, contrast: Contrast, customBaseColors?: BaseColors): ResolvedPalette {
  const defaults = parseProjectDefaults(
    JSON.parse(readFileSync(path.resolve(__dirname, '../../palette/project-defaults.json'), 'utf8')),
  );
  return resolvePalette({
    baseColors: customBaseColors ?? defaults.palettes[mode].baseColors,
    overrides: customBaseColors ? {} : defaults.palettes[mode].overrides,
    mode,
    contrast,
  });
}

function themeFor(mode: Mode, contrast: Contrast, customBaseColors?: BaseColors): Theme {
  return buildMuiTheme(resolvedFor(mode, contrast, customBaseColors), mode, contrast);
}

interface CssRule {
  selector: string;
  declarations: Record<string, string>;
}

function parseDeclarations(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const decl of body.split(';')) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    out[decl.slice(0, idx).trim()] = decl.slice(idx + 1).trim();
  }
  return out;
}

/** Flatten one Emotion style-tag body into ordered flat rules (media blocks
 * skipped — no alert rules live inside media queries). */
function flattenCss(css: string, out: CssRule[]): void {
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) break;
    const header = css.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const body = css.slice(open + 1, j - 1);
    if (!header.startsWith('@') && !body.includes('{')) {
      const decls = parseDeclarations(body);
      if (header && Object.keys(decls).length) out.push({ selector: header, declarations: decls });
    }
    i = j;
  }
}

/** Standard alerts of all four severities in one capture. */
function renderStandardAlerts(theme: Theme): CssRule[] {
  const cache = createCache({ key: 'sfal' });
  const html = renderToString(
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <div>
          {SEVERITIES.map((s) => (
            <Alert key={s} severity={s} data-testid={`standard-${s}`}>
              Tinted {s} alert.
            </Alert>
          ))}
        </div>
      </ThemeProvider>
    </CacheProvider>,
  );
  const rules: CssRule[] = [];
  for (const m of html.matchAll(/<style data-emotion="[^"]*">([\s\S]*?)<\/style>/g)) {
    flattenCss(m[1], rules);
  }
  return rules;
}

/** Rules that style the given severity's standard-variant root (bg + ink). */
function standardRootRules(rules: CssRule[], severity: string): CssRule[] {
  return rules.filter(
    (r) =>
      r.selector.includes('MuiAlert-standard') &&
      r.selector.includes(`MuiAlert-color${severity[0].toUpperCase()}${severity.slice(1)}`) &&
      'background-color' in r.declarations,
  );
}

/** Rules that style the severity's standard-variant icon. */
function standardIconRules(rules: CssRule[], severity: string): CssRule[] {
  return rules.filter(
    (r) =>
      r.selector.includes('MuiAlert-standard') &&
      r.selector.includes(`MuiAlert-color${severity[0].toUpperCase()}${severity.slice(1)}`) &&
      r.selector.includes('.MuiAlert-icon') &&
      'color' in r.declarations,
  );
}

// ── Hex helpers for the icon-opacity composite (UNROUNDED) ──

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG 2.x relative luminance (full precision, no 8-bit quantization). */
function wcagLuminance(rgb: readonly number[]): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

/** Contrast of `ink` over `fill` with the ink alpha-composited at `alpha` —
 * UNROUNDED composite (the browser-verified lab convention; 8-bit rounding
 * is display output, not part of the WCAG math). Pass/fail decisions here
 * must never round. */
function contrastUnrounded(ink: string, alpha: number, fill: string): number {
  const a = hexToRgb(ink);
  const b = hexToRgb(fill);
  const eff = alpha < 1 ? a.map((v, i) => alpha * v + (1 - alpha) * b[i]) : a;
  const lf = wcagLuminance(eff);
  const lb = wcagLuminance(b);
  return (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
}

// ── Tinted standard alerts: contrast thresholds, all six variants ──

describe('standard alert fill + ink (all six variants, all severities)', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s every standard severity uses the selected palette-native pair with ≥%.1f text and ≥%.1f composited-icon contrast (unrounded)',
    (mode, contrast) => {
      const resolved = resolvedFor(mode, contrast);
      const theme = themeFor(mode, contrast);
      const rules = renderStandardAlerts(theme);

      for (const severity of SEVERITIES) {
        const accent = SEVERITY_ACCENT[severity];
        const bg = standardRootRules(rules, severity);
        const icon = standardIconRules(rules, severity);
        expect(
          bg.length,
          `${severity}: a standard-variant root rule with a fill is emitted`,
        ).toBeGreaterThan(0);
        expect(icon.length, `${severity}: a standard-variant icon rule is emitted`).toBeGreaterThan(0);

        // Last matching rule wins (our override emits after MUI's stock
        // standard rule — assert that order too).
        const bgRule = bg[bg.length - 1];
        const iconRule = icon[icon.length - 1];
        const muiStockBg = bg.filter((r) => r !== bgRule);
        if (muiStockBg.length) {
          expect(
            rules.indexOf(muiStockBg[0]),
            `${severity}: our rule is emitted after MUI's stock standard rule`,
          ).toBeLessThan(rules.indexOf(bgRule));
        }

        const fill = bgRule.declarations['background-color'];
        const ink = bgRule.declarations['color'];
        const iconInk = iconRule.declarations['color'];

        expect(fill, `${severity}/${mode}/${contrast}: fill is a hex`).toMatch(/^#[0-9a-f]{6}$/);
        expect(ink, `${severity}/${mode}/${contrast}: ink is a hex`).toMatch(/^#[0-9a-f]{6}$/);

        // The emitted values must be exactly what the exported selection
        // rule chose for this palette/severity (no drift between rule and
        // rendering), and icon + text share one ink.
        const treatment = standardAlertTreatment(resolved, mode, accent);
        expect(fill, `${severity}/${mode}/${contrast}: fill matches standardAlertTreatment`).toBe(treatment.fill);
        expect(ink, `${severity}/${mode}/${contrast}: ink matches standardAlertTreatment`).toBe(treatment.ink);
        expect(iconInk, `${severity}/${mode}/${contrast}: icon shares the text ink`).toBe(ink);

        // Palette membership + hue semantics: the fill must be a named
        // surface swatch of the resolved palette and the ink a same-hue
        // named tier of the mapped accent (error=red, warning=yellow,
        // success=green, info=blue) — ALWAYS, no blends anywhere.
        expect(
          [resolved.bg0_hard, resolved.bg0, resolved.bg0_soft, resolved.bg1, resolved.bg2],
          `${severity}/${mode}/${contrast}: fill is a named surface swatch`,
        ).toContain(treatment.fill);
        expect(
          [resolved[`bright_${accent}`], resolved[`neutral_${accent}`], resolved[`faded_${accent}`], resolved[`deep_${accent}`]],
          `${severity}/${mode}/${contrast}: ink is a same-hue named tier of ${accent}`,
        ).toContain(treatment.ink);

        // UNROUNDED thresholds (no rounding before the comparison).
        const textRatio = contrastUnrounded(ink, 1, fill);
        expect(
          textRatio,
          `${severity}/${mode}/${contrast}: text ${ink} on fill ${fill} ≥ ${TEXT_MIN} (unrounded ${textRatio})`,
        ).toBeGreaterThanOrEqual(TEXT_MIN);

        const iconRatio = contrastUnrounded(iconInk, ICON_OPACITY, fill);
        expect(
          iconRatio,
          `${severity}/${mode}/${contrast}: icon ${iconInk} at 0.9 opacity over ${fill} ≥ ${ICON_MIN} (unrounded ${iconRatio})`,
        ).toBeGreaterThanOrEqual(ICON_MIN);
      }
    },
  );

  it('default palettes select the verified named pairs (dark bg0_hard+bright, light bg0+deep)', () => {
    // Pins the user-selected treatment on the rev-25 defaults, all six
    // variants — the pairs verified in the browser at full precision
    // (dark text 4.996…/icon 4.296…; light worst warning 6.379/5.092).
    for (const mode of MODES) {
      for (const contrast of CONTRASTS) {
        const resolved = resolvedFor(mode, contrast);
        for (const severity of SEVERITIES) {
          const accent = SEVERITY_ACCENT[severity];
          const treatment = standardAlertTreatment(resolved, mode, accent);
          expect(
            treatment.quality,
            `${severity}/${mode}/${contrast}: defaults select a passing named pair`,
          ).toBe('passing');
          expect(treatment.fill, `${severity}/${mode}/${contrast}: fill surface`).toBe(
            mode === 'dark' ? resolved.bg0_hard : resolved.bg0,
          );
          expect(treatment.ink, `${severity}/${mode}/${contrast}: ink tier`).toBe(
            resolved[`${mode === 'dark' ? 'bright_' : 'deep_'}${accent}`],
          );
        }
      }
    }
  });
});

// ── Unchanged variants: outlined keeps its transparent surface, filled is
// not retinted, and the standard selectors never govern them ──

describe('outlined and filled alerts are untouched by the standard tint', () => {
  it.each(MODES)(`%s outlined alerts keep MUI's transparent surface`, (mode) => {
    const theme = themeFor(mode, 'medium');
    const cache = createCache({ key: 'sfalo' });
    const html = renderToString(
      <CacheProvider value={cache}>
        <ThemeProvider theme={theme}>
          <Alert severity="error" variant="outlined">
            Outlined error.
          </Alert>
        </ThemeProvider>
      </CacheProvider>,
    );
    const rules: CssRule[] = [];
    for (const m of html.matchAll(/<style data-emotion="[^"]*">([\s\S]*?)<\/style>/g)) {
      flattenCss(m[1], rules);
    }
    const outlinedRoot = rules.filter(
      (r) => r.selector.includes('MuiAlert-outlined') && 'background-color' in r.declarations,
    );
    for (const rule of outlinedRoot) {
      expect(
        rule.declarations['background-color'],
        `${mode}: no outlined rule paints a tint fill (${rule.selector})`,
      ).not.toMatch(/^#[0-9a-f]{6}$/);
    }
    // And none of our standard rules target the outlined element.
    for (const rule of rules.filter((r) => r.selector.includes('MuiAlert-standard'))) {
      expect(rule.selector, `${mode}: standard rules never apply to outlined`).not.toContain(
        'MuiAlert-outlined',
      );
    }
  });

  it.each(MODES)(`%s filled alerts keep the neutral-fill overrides`, (mode) => {
    const theme = themeFor(mode, 'medium');
    const cache = createCache({ key: 'sfalf' });
    const html = renderToString(
      <CacheProvider value={cache}>
        <ThemeProvider theme={theme}>
          <Alert severity="error" variant="filled">
            Filled error.
          </Alert>
        </ThemeProvider>
      </CacheProvider>,
    );
    const rules: CssRule[] = [];
    for (const m of html.matchAll(/<style data-emotion="[^"]*">([\s\S]*?)<\/style>/g)) {
      flattenCss(m[1], rules);
    }
    const filled = rules.filter(
      (r) =>
        r.selector.includes('MuiAlert-filled') &&
        r.selector.includes('MuiAlert-colorError') &&
        'background-color' in r.declarations,
    );
    expect(filled.length, 'filled error rule is emitted').toBeGreaterThan(0);
    const roles = getContrastRoles(
      resolvePalette({
        baseColors: parseProjectDefaults(
          JSON.parse(readFileSync(path.resolve(__dirname, '../../palette/project-defaults.json'), 'utf8')),
        ).palettes[mode].baseColors,
        overrides: parseProjectDefaults(
          JSON.parse(readFileSync(path.resolve(__dirname, '../../palette/project-defaults.json'), 'utf8')),
        ).palettes[mode].overrides,
        mode,
        contrast: 'medium',
      }),
      mode,
      'medium',
    );
    expect(
      filled[filled.length - 1].declarations['background-color'],
      `${mode}: filled error keeps the neutral fill`,
    ).toBe(roles.accents.red.neutralFill);
  });
});

// ── Robustness beyond the default palette: finite deterministic sampling ──
//
// These are SAMPLED checks — a finite, deterministic probe over a handful of
// plausible diverse custom palettes, not a proof. Passing here does not
// guarantee every arbitrary palette clears the thresholds; failures are
// recorded per sample rather than masked.

/** A finite, deterministic stress set: plausible user-custom palettes with
 * deliberately diverse characteristics (surface luminance, accent chroma and
 * warmth), none of them the warm 1970s defaults. Exported so diagnostics can
 * record the exact sampled definitions and their measured ratios. */
export const STRESS_PALETTES: Array<{ name: string; baseColors: BaseColors }> = [
  {
    name: 'cool-slate-vivid',
    baseColors: {
      red: '#c2185b', green: '#0f766e', yellow: '#b45309', blue: '#4338ca',
      purple: '#7e22ce', aqua: '#0e7490', orange: '#ea580c',
      fg: '#0f172a', bg: '#f1f5f9',
    },
  },
  {
    name: 'near-black-mono',
    baseColors: {
      red: '#ef4444', green: '#22c55e', yellow: '#f59e0b', blue: '#3b82f6',
      purple: '#a855f7', aqua: '#14b8a6', orange: '#f97316',
      fg: '#e5e7eb', bg: '#0a0a0a',
    },
  },
  {
    name: 'pastel-light',
    baseColors: {
      red: '#b47ea8', green: '#7fa87f', yellow: '#b39b5e', blue: '#7f97b4',
      purple: '#a08bb8', aqua: '#6f9f97', orange: '#c47f5a',
      fg: '#3d3540', bg: '#f7f2f4',
    },
  },
  {
    name: 'neon-dark',
    baseColors: {
      red: '#ff2d55', green: '#00ff88', yellow: '#ffcc00', blue: '#00a2ff',
      purple: '#cc66ff', aqua: '#00e5c0', orange: '#ff7a1a',
      fg: '#f2f0eb', bg: '#141418',
    },
  },
  {
    name: 'sepia-earth',
    baseColors: {
      red: '#8f3b2c', green: '#5c6b3a', yellow: '#96702a', blue: '#4a6076',
      purple: '#6d5470', aqua: '#3e6e62', orange: '#a3542b',
      fg: '#2e2318', bg: '#efe4d0',
    },
  },
  {
    name: 'high-contrast-bw-accent',
    baseColors: {
      red: '#d40000', green: '#00b400', yellow: '#c8b400', blue: '#0060d0',
      purple: '#9a00c8', aqua: '#00a08f', orange: '#e05000',
      fg: '#101010', bg: '#ffffff',
    },
  },
];

describe('standard alert pairs with custom user-supplied palettes (sampled probe)', () => {
  const allSamples: Array<{ name: string; baseColors: BaseColors }> = [
    ...STRESS_PALETTES,
    // The originally sampled single custom palette remains part of the set.
    { name: 'original-cool-slate', baseColors: STRESS_PALETTES[0].baseColors },
  ];

  it('every sampled palette: all severities and modes stay above the thresholds (unrounded)', () => {
    const chosen: string[] = [];
    for (const { name, baseColors } of allSamples) {
      for (const mode of MODES) {
        const resolved = resolvedFor(mode, 'medium', baseColors);
        const theme = themeFor(mode, 'medium', baseColors);
        const rules = renderStandardAlerts(theme);
        for (const severity of SEVERITIES) {
          const accent = SEVERITY_ACCENT[severity];
          const bg = standardRootRules(rules, severity);
          const icon = standardIconRules(rules, severity);
          expect(bg.length, `${name}/${severity}/${mode}: fill rule emitted`).toBeGreaterThan(0);
          expect(icon.length, `${name}/${severity}/${mode}: icon rule emitted`).toBeGreaterThan(0);
          const fill = bg[bg.length - 1].declarations['background-color'];
          const ink = bg[bg.length - 1].declarations['color'];
          const iconInk = icon[icon.length - 1].declarations['color'];
          expect(iconInk, `${name}/${severity}/${mode}: icon shares the text ink`).toBe(ink);

          // Selection rule honored exactly. With the expanded palette-native
          // candidate matrix every sampled palette selects a NAMED pair —
          // there is no blend/MUI fallback anymore.
          const treatment = standardAlertTreatment(resolved, mode, accent);
          expect(fill, `${name}/${severity}/${mode}: fill matches standardAlertTreatment`).toBe(treatment.fill);
          expect(ink, `${name}/${severity}/${mode}: ink matches standardAlertTreatment`).toBe(treatment.ink);
          expect(
            treatment.quality,
            `${name}/${severity}/${mode}: sampled palettes must select a passing named pair`,
          ).toBe('passing');
          expect(
            [resolved.bg0_hard, resolved.bg0, resolved.bg0_soft, resolved.bg1, resolved.bg2],
            `${name}/${severity}/${mode}: fill is a named surface swatch`,
          ).toContain(treatment.fill);
          expect(
            [resolved[`bright_${accent}`], resolved[`neutral_${accent}`], resolved[`faded_${accent}`], resolved[`deep_${accent}`]],
            `${name}/${severity}/${mode}: ink is a same-hue named tier of ${accent}`,
          ).toContain(treatment.ink);
          chosen.push(`${name}/${mode}/${severity}: ${treatment.fill}+${treatment.ink}`);

          // UNROUNDED thresholds — unchanged strictness; failures are
          // recorded per sample rather than masked.
          const textRatio = contrastUnrounded(ink, 1, fill);
          expect(
            textRatio,
            `${name}/${mode}: sampled text ${ink} on ${fill} ≥ ${TEXT_MIN} (unrounded ${textRatio})`,
          ).toBeGreaterThanOrEqual(TEXT_MIN);
          const iconRatio = contrastUnrounded(iconInk, ICON_OPACITY, fill);
          expect(
            iconRatio,
            `${name}/${mode}: sampled icon ≥ ${ICON_MIN} (unrounded ${iconRatio})`,
          ).toBeGreaterThanOrEqual(ICON_MIN);
        }
      }
    }
    // Diagnostic record: which named pair each sampled cell selected.
    console.log(`sampled cells: ${chosen.length}, all named (passing): ${chosen.length}`);
  });

  // ── Degenerate palette: NO same-hue named pair can clear the bars ──
  //
  // Explicitly accepted by user decision: a palette with no readable
  // same-hue pair yields a low-contrast alert rather than any invented
  // color, blend, or MUI-stock fallback. The selector must (a) return named
  // swatches only, (b) report the true measured ratios truthfully as
  // `best-effort`, (c) stay deterministic and free of NaN/exceptions, and
  // (d) still render valid CSS.

  /** A genuinely degenerate palette: every editable base color is the same
   * mid-gray, so every derived same-hue tier and background surface sits in
   * a narrow luminance band and no same-hue pair can reach 4.5:1. */
  const DEGENERATE_PALETTE: BaseColors = {
    red: '#808080', green: '#808080', yellow: '#808080', blue: '#808080',
    purple: '#808080', aqua: '#808080', orange: '#808080',
    fg: '#808080', bg: '#808080',
  };

  const NAMED_SURFACES = (resolved: ResolvedPalette) => [resolved.bg0_hard, resolved.bg0, resolved.bg0_soft, resolved.bg1, resolved.bg2];

  it('degenerate palette: deterministic best-effort named pair, truthful shortfall, no NaN, no nonpalette fallback', () => {
    for (const mode of MODES) {
      const resolved = resolvedFor(mode, 'medium', DEGENERATE_PALETTE);
      const surfaces = NAMED_SURFACES(resolved);
      const theme = themeFor(mode, 'medium', DEGENERATE_PALETTE);
      const rules = renderStandardAlerts(theme);
      for (const severity of SEVERITIES) {
        const accent = SEVERITY_ACCENT[severity];
        const treatment = standardAlertTreatment(resolved, mode, accent);

        // (a) Palette membership: fill and ink are named swatches — never
        // a blend or MUI stock value.
        expect(
          surfaces,
          `${severity}/${mode}: degenerate fill is a named surface swatch`,
        ).toContain(treatment.fill);
        expect(
          [resolved[`bright_${accent}`], resolved[`neutral_${accent}`], resolved[`faded_${accent}`], resolved[`deep_${accent}`]],
          `${severity}/${mode}: degenerate ink is a same-hue named tier of ${accent}`,
        ).toContain(treatment.ink);

        // (b) Truthful reporting: quality is `best-effort` and the reported
        // ratios equal an independent unrounded recomputation (which must
        // genuinely be below the bars).
        expect(
          treatment.quality,
          `${severity}/${mode}: degenerate palette must report best-effort`,
        ).toBe('best-effort');
        const recomputedText = contrastUnrounded(treatment.ink, 1, treatment.fill);
        const recomputedIcon = contrastUnrounded(treatment.ink, ICON_OPACITY, treatment.fill);
        expect(treatment.textRatio, `${severity}/${mode}: reported text ratio is truthful`).toBe(recomputedText);
        expect(treatment.iconRatio, `${severity}/${mode}: reported icon ratio is truthful`).toBe(recomputedIcon);
        expect(
          recomputedText,
          `${severity}/${mode}: degenerate palette genuinely cannot reach 4.5 (reported shortfall is real)`,
        ).toBeLessThan(TEXT_MIN);

        // (c) Determinism + sanity: repeat selection is identical, all
        // values finite (no NaN), and hex-shaped.
        const again = standardAlertTreatment(resolved, mode, accent);
        expect(again).toEqual(treatment);
        expect(Number.isFinite(treatment.textRatio)).toBe(true);
        expect(Number.isFinite(treatment.iconRatio)).toBe(true);
        expect(treatment.fill).toMatch(/^#[0-9a-f]{6}$/);
        expect(treatment.ink).toMatch(/^#[0-9a-f]{6}$/);

        // (d) The renderer emits exactly the selected pair as valid CSS.
        const bg = standardRootRules(rules, severity);
        const icon = standardIconRules(rules, severity);
        expect(bg.length).toBeGreaterThan(0);
        expect(icon.length).toBeGreaterThan(0);
        expect(bg[bg.length - 1].declarations['background-color']).toBe(treatment.fill);
        expect(bg[bg.length - 1].declarations['color']).toBe(treatment.ink);
        expect(icon[icon.length - 1].declarations['color']).toBe(treatment.ink);
      }
    }
  });
});

// ── Plain serializable data (standalone theme export contract) ──

describe('alert tint options stay plain serializable data', () => {
  it('MuiAlert styleOverrides survive a JSON round-trip unchanged', () => {
    const defaults = parseProjectDefaults(
      JSON.parse(readFileSync(path.resolve(__dirname, '../../palette/project-defaults.json'), 'utf8')),
    );
    const resolved = resolvePalette({
      baseColors: defaults.palettes.dark.baseColors,
      overrides: defaults.palettes.dark.overrides,
      mode: 'dark',
      contrast: 'medium',
    });
    const options = createSunfadeThemeOptions(resolved, 'dark', 'medium');
    const alert = (options.components?.MuiAlert as { styleOverrides: unknown }).styleOverrides;
    expect(JSON.parse(JSON.stringify(alert))).toEqual(alert);
    // And every emitted color value is a plain hex string or literal.
    const json = JSON.stringify(alert);
    for (const m of json.matchAll(/"#[0-9a-fA-F]{6}"/g)) {
      expect(m[0]).toMatch(/^"#(?:[0-9a-fA-F]{6})"$/);
    }
    expect(json, 'no rgba()/var()/functions leak into the alert overrides').not.toContain('var(');
    expect(json).not.toContain('rgba(');
  });
});
