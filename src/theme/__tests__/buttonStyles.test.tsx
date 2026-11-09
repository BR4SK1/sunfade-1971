// Effective-styling regression tests for Sunfade MUI buttons.
//
// The user-visible bug this guards against: contained buttons rendering with
// bright (light-tier) fills at rest and darkening on hover, text buttons
// growing a frame border, and outlined borders not tracking their text color.
// These tests do NOT just assert theme options — they render real `Button`s
// through the Emotion engine used by MUI (CacheProvider + renderToString),
// capture the CSS that MUI emits for each button class, and compute the
// effective cascaded values (last declaration wins at equal specificity, with
// @media (hover: …) wrappers tracked per rule).
//
// Limitations: no headless browser is available in this environment, so
// hover/focus/disabled are verified at the emitted-CSS level (rule order +
// media queries) rather than by simulated pointer events. The emitted CSS is
// captured from the SSR HTML's <style data-emotion> tags: createCache()
// overwrites any user-provided insert hook, so capturing through it silently
// yields nothing.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import createCache from '@emotion/cache';
import { CacheProvider, ThemeProvider } from '@emotion/react';
import { Button, ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { alpha, getContrastRatio, createTheme } from '@mui/material/styles';
import { TextField } from '@mui/material';
import { beforeAll, describe, expect, it } from 'vitest';

import { parseProjectDefaults } from '../../palette/project-defaults';
import { resolvePalette } from '../../palette/resolver';
import { serializeMuiTheme } from '../../palette/serializers/mui-serializer';
import type { AccentName, Contrast, Mode, ResolvedPalette } from '../../palette/types';
import { buildMuiTheme } from '../buildMuiTheme';
import { getContrastRoles } from '../contrastRoles';

// ── Captured CSS machinery ──────────────────────────────────────────

interface CssRule {
  selector: string;
  declarations: Record<string, string>;
  /** @media condition the rule sits inside, or '' for unconditional. */
  media: string;
  /** Emission order across the whole render (later wins at equal specificity). */
  order: number;
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

/**
 * Flatten one Emotion style-tag body into an ordered rule list, appended to
 * `out` (order = index within `out`, so cross-tag ordering is preserved).
 *
 * Emotion/MUI output at this level is a SEQUENCE of flat rules and one-level
 * @media blocks — e.g. `.a{...}.a:hover{...}@media (hover: hover){.a:hover{...}}`
 * — so a naive "first @media wins" parse loses rules. Stylis pre-expands `&`
 * nesting before emission, so plain-rule bodies are flat declarations; anything
 * else (keyframes, nested rules) is skipped as irrelevant to these assertions.
 */
function flattenCss(css: string, media: string, out: CssRule[]): void {
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
    if (header.startsWith('@media')) {
      flattenCss(body, header.slice('@media'.length).trim(), out);
    } else if (header.startsWith('@')) {
      // @keyframes / @font-face / etc — not needed for button assertions.
    } else if (!body.includes('{')) {
      const decls = parseDeclarations(body);
      if (header && Object.keys(decls).length) {
        out.push({ selector: header, declarations: decls, media, order: out.length });
      }
    }
    i = j;
  }
}

/** Classes of the FIRST compound selector (before any combinator or space). */
function firstCompoundClasses(selector: string): string[] {
  const first = selector.split(/[\s>+~]/, 1)[0] ?? '';
  return first.match(/\.[A-Za-z][A-Za-z0-9_-]*/g) ?? [];
}

/**
 * Rules that style the button element itself: every class in the rule's first
 * compound selector must be on the element. Descendant rules (`.cls .ripple`)
 * and rules for other elements are excluded.
 */
function rulesForElement(rules: CssRule[], classList: string[]): CssRule[] {
  return rules.filter((rule) => {
    const classes = firstCompoundClasses(rule.selector);
    return classes.length > 0 && classes.every((c) => classList.includes(c.slice(1)));
  });
}

function isState(rule: CssRule, state: 'rest' | 'hover' | 'active' | 'focus' | 'disabled'): boolean {
  const sel = rule.selector;
  switch (state) {
    case 'rest':
      return !/(:hover|:active|:focus|Mui-focusVisible|Mui-disabled|MuiButton-loading)/.test(sel);
    case 'hover':
      // MUI wraps hover rules in @media (hover: hover) and emits touch
      // counterparts inside @media (hover: none); unwrapped :hover rules also
      // exist (custom variant rules). Only the former two paint on a pointer
      // device — skip the hover: none counterparts.
      if (rule.media.includes('hover: none')) return false;
      return /:hover/.test(sel);
    case 'active':
      return /:active/.test(sel);
    case 'focus':
      return /(:focus|Mui-focusVisible)/.test(sel);
    case 'disabled':
      return /Mui-disabled/.test(sel);
  }
}

/**
 * Effective value of a property in a state: the LAST declaration among
 * applicable rules wins (Emotion/MUI rules for one element share the class
 * chain; media-wrapped hover rules are tracked by their media condition).
 */
function effectiveValue(rules: CssRule[], state: 'rest' | 'hover' | 'active' | 'focus' | 'disabled', property: string): string | undefined {
  let value: string | undefined;
  let bestOrder = -1;
  for (const rule of rules) {
    if (!isState(rule, state)) continue;
    if (property in rule.declarations) {
      value = rule.declarations[property];
      bestOrder = rule.order;
    }
  }
  return value ?? undefined;
}

// ── Theme setup ─────────────────────────────────────────────────────

const MODES: readonly Mode[] = ['dark', 'light'];
const CONTRASTS: readonly Contrast[] = ['soft', 'medium', 'hard'];
const COLORS = ['primary', 'secondary', 'error', 'warning', 'success', 'info'] as const;
const VARIANTS = ['contained', 'outlined', 'text'] as const;

/** MUI palette color → Sunfade accent name (mirrors the shared theme source).
 * `secondary` is not an accent: it is fg-family chrome, handled by `fillTiers`. */
const COLOR_ACCENT: Record<Exclude<(typeof COLORS)[number], 'secondary'>, AccentName> = {
  primary: 'orange',
  error: 'red',
  warning: 'yellow',
  success: 'green',
  info: 'blue',
};

/** Resting/hover FILL tiers for a MUI color: the raw neutral/bright swatches
 * for accent-mapped colors, the fg2/fg1 swatches for secondary's fg-family
 * chrome (mirrors the shared theme source). */
function fillTiers(color: (typeof COLORS)[number], resolved: ResolvedPalette): { rest: string; hover: string } {
  if (color === 'secondary') return { rest: resolved.fg2, hover: resolved.fg1 };
  return { rest: resolved[`neutral_${COLOR_ACCENT[color]}`], hover: resolved[`bright_${COLOR_ACCENT[color]}`] };
}

function resolveRoles(mode: Mode, contrast: Contrast) {
  const defaults = parseProjectDefaults(
    JSON.parse(readFileSync(path.resolve(__dirname, '../../palette/project-defaults.json'), 'utf8')),
  );
  const resolved = resolvePalette({
    baseColors: defaults.palettes[mode].baseColors,
    overrides: defaults.palettes[mode].overrides,
    mode,
    contrast,
  });
  return { theme: buildMuiTheme(resolved, mode, contrast), resolved };
}

// ── Rendering helpers ───────────────────────────────────────────────

interface Capture {
  html: string;
  rules: CssRule[];
}

function renderButtons(theme: Theme, nodes: React.ReactNode): Capture {
  const cache = createCache({ key: 'sftest' });
  const html = renderToString(
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>{nodes}</ThemeProvider>
    </CacheProvider>,
  );
  // createCache() silently discards a custom insert hook, so capture the
  // emitted CSS from the SSR HTML's style tags instead — they are the
  // authoritative record of what was emitted, in emission order.
  const rules: CssRule[] = [];
  for (const m of html.matchAll(/<style data-emotion="[^"]*">([\s\S]*?)<\/style>/g)) {
    flattenCss(m[1], '', rules);
  }
  return { html, rules };
}

/**
 * Extract the class list of the button whose content contains `label`.
 * MUI renders the label as a direct text child followed by the TouchRipple
 * span, so matching must not assume `</button>` right after the label.
 */
function buttonClassesForLabel(html: string, label: string): string[] {
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    if (m[2].includes(label)) {
      const cm = /class="([^"]*)"/.exec(m[1]);
      if (!cm) throw new Error(`button with label "${label}" has no class attribute`);
      return cm[1].split(/\s+/);
    }
  }
  throw new Error(`button with label "${label}" not found in rendered HTML`);
}

// ── Build one capture per variant (all colors inside) ────────────────

interface VariantCapture {
  theme: Theme;
  resolved: ResolvedPalette;
  rules: CssRule[];
  classOf: Record<string, string[]>;
}

function captureVariant(theme: Theme, resolved: ResolvedPalette): VariantCapture {
  const nodes = createElement(
    'div',
    null,
    ...VARIANTS.flatMap((variant) =>
      COLORS.map((color) =>
        createElement(
          'div',
          { key: `${variant}-${color}`, 'data-testid': `${variant}-${color}` },
          createElement(Button, { variant, color }, `x-${variant}-${color}`),
        ),
      ),
    ),
  );
  const { html, rules } = renderButtons(theme, nodes);
  const classOf: Record<string, string[]> = {};
  for (const variant of VARIANTS) {
    for (const color of COLORS) {
      classOf[`${variant}-${color}`] = buttonClassesForLabel(html, `x-${variant}-${color}`);
    }
  }
  return { theme, resolved, rules, classOf };
}

// ── The regression suite ────────────────────────────────────────────

describe.each(MODES.map((mode) => [mode] as const))('%s mode buttons (effective CSS)', (mode) => {
  describe.each(CONTRASTS.map((contrast) => [contrast] as const))('contrast %s', (contrast) => {
    let capture: VariantCapture;

    beforeAll(() => {
      const roles = resolveRoles(mode, contrast);
      capture = captureVariant(roles.theme, roles.resolved);
    });

    it.each(COLORS)('%s contained: exact neutral swatch at rest, exact bright swatch on hover', (color) => {
      const palette = (capture.theme.palette as never as Record<string, { main: string; light: string; dark: string; contrastText: string; lightContrastText: string }>)[color];
      const tiers = fillTiers(color, capture.resolved);
      const classes = capture.classOf[`contained-${color}`];
      const rules = rulesForElement(capture.rules, classes);

      // REST FILL: the emitted variable must be the RAW neutral swatch — the
      // user's exact color, never a readability-adjusted text role.
      const restBg = effectiveValue(rules, 'rest', '--variant-containedBg');
      expect(restBg, `${mode}/${contrast} ${color} rest fill`).toBe(tiers.rest);

      // REST LABEL: the ink must be ≥ 4.5:1 on that actual fill.
      const restColor = effectiveValue(rules, 'rest', '--variant-containedColor');
      expect(restColor, `${mode}/${contrast} ${color} rest label`).toBeDefined();
      expect(getContrastRatio(restColor!, restBg!), `${mode}/${contrast} ${color} rest label ≥ 4.5:1 on raw neutral fill`).toBeGreaterThanOrEqual(4.5);

      // HOVER FILL: the last background-color declaration among hover rules
      // must be the RAW bright swatch (this is what actually paints the
      // button — it wins over MUI's default hover variable that darkens to
      // palette[color].dark).
      const hoverBg = effectiveValue(rules, 'hover', 'background-color');
      expect(hoverBg, `${mode}/${contrast} ${color} hover fill`).toBe(tiers.hover);

      // HOVER LABEL: the ink must be ≥ 4.5:1 on that actual bright fill.
      const hoverColor = effectiveValue(rules, 'hover', 'color');
      expect(hoverColor, `${mode}/${contrast} ${color} hover label`).toBeDefined();
      expect(getContrastRatio(hoverColor!, hoverBg!), `${mode}/${contrast} ${color} hover label ≥ 4.5:1 on raw bright fill`).toBeGreaterThanOrEqual(4.5);

      // MUI's default hover still darkens the variable underneath; our bright
      // fill must win, so it must be declared after that default rule.
      const defaultHoverVar = effectiveValue(rules, 'hover', '--variant-containedBg');
      expect(defaultHoverVar).toBe(palette.dark);
    });

    it.each(COLORS)('%s outlined: border tracks text color; hover lifts to the bright fill', (color) => {
      const themeRoles = getContrastRoles(capture.resolved, mode, contrast);
      const accent = color === 'secondary'
        ? themeRoles.secondary
        : themeRoles.accents[COLOR_ACCENT[color as Exclude<typeof color, 'secondary'>]];
      const classes = capture.classOf[`outlined-${color}`];
      const rules = rulesForElement(capture.rules, classes);
      // The raw resolved palette swatch — read straight off the resolved
      // palette, independent of the theme pipeline (neutral_<accent> for the
      // semantic colors, fg2 for secondary).
      const restSwatch = fillTiers(color, capture.resolved).rest;

      // REST: border and ink are the SAME RAW NEUTRAL SWATCH — the exact
      // resolved `neutral_<accent>` color (fg2 for secondary), explicitly
      // directed by the user for outlined/text resting ink, NOT the
      // readability-adjusted `main` text role. The contrast of this ink
      // against the surfaces may sit below 4.5:1 in some variants; that is
      // accepted user direction and deliberately NOT asserted here (measured
      // values are documented in the theme source and the change report).
      const restBorder = effectiveValue(rules, 'rest', '--variant-outlinedBorder');
      const restText = effectiveValue(rules, 'rest', '--variant-outlinedColor');
      expect(restBorder, `${mode}/${contrast} ${color} outlined rest border = raw neutral swatch`).toBe(restSwatch);
      expect(restText, `${mode}/${contrast} ${color} outlined rest ink = raw neutral swatch`).toBe(restSwatch);
      expect(restBorder).toBe(restText);

      // HOVER FILL: the solid bright tier — the same highlight the contained
      // variant gets — NOT MUI's faint translucent wash. Declared directly so
      // it wins over MUI's `--variant-outlinedBg` alpha default.
      const hoverBg = effectiveValue(rules, 'hover', 'background-color');
      expect(hoverBg, `${mode}/${contrast} ${color} outlined hover fill`).toBe(accent.light);

      // HOVER LABEL: recomputed for the bright fill, ≥ 4.5:1 on it.
      const hoverColor = effectiveValue(rules, 'hover', 'color');
      expect(hoverColor, `${mode}/${contrast} ${color} outlined hover ink`).toBe(accent.lightContrastText);
      expect(getContrastRatio(hoverColor!, hoverBg!), `${mode}/${contrast} ${color} outlined hover label ≥ 4.5:1 on bright fill`).toBeGreaterThanOrEqual(4.5);

      // HOVER BORDER: keeps tracking the button's text color — which on hover
      // is the recomputed ink, so border and label stay one color.
      const hoverBorder = effectiveValue(rules, 'hover', '--variant-outlinedBorder');
      expect(hoverBorder, `${mode}/${contrast} ${color} outlined hover border`).toBe(accent.lightContrastText);

      // TOUCH: no hover rule may fire — the touch counterparts inside
      // @media (hover: none) must not introduce a hover fill or ink change
      // (the outlined hover rules are pointer-only like MUI's own).
      for (const rule of rules) {
        if (rule.media.includes('hover: none') && /:hover/.test(rule.selector)) {
          expect(rule.declarations['background-color'], `${mode}/${contrast} ${color} touch hover bg`).toBeUndefined();
          expect(rule.declarations['color'], `${mode}/${contrast} ${color} touch hover ink`).toBeUndefined();
        }
      }
    });

    it.each(COLORS)('%s text: no border at all; resting ink is the raw neutral swatch', (color) => {
      const classes = capture.classOf[`text-${color}`];
      const rules = rulesForElement(capture.rules, classes);
      // Resting ink: the exact resolved `neutral_<accent>` swatch (fg2 for
      // secondary) — explicit user direction, not the readability-adjusted
      // `main` role. Contrast is deliberately NOT gated here (accepted user
      // trade-off).
      const restInk = effectiveValue(rules, 'rest', '--variant-textColor');
      expect(restInk, `${mode}/${contrast} ${color} text rest ink = raw neutral swatch`).toBe(fillTiers(color, capture.resolved).rest);
      for (const rule of rules) {
        for (const [prop, value] of Object.entries(rule.declarations)) {
          if (prop === 'border' || prop === 'border-color') {
            expect(value).toBe('0');
          }
        }
      }
    });

    it.each(COLORS)('%s labels stay readable at ≥ 4.5:1 on their fills', (color) => {
      const roles = capture.theme.palette as never as Record<string, { main: string; light: string; contrastText: string; lightContrastText: string }>;
      const palette = roles[color];
      expect(getContrastRatio(palette.contrastText, palette.main)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(palette.lightContrastText, palette.light)).toBeGreaterThanOrEqual(4.5);
    });
  });
});

// ── Neutral-swatch resting ink: focused regressions ─────────────────
//
// Explicit user direction: the resting ink of outlined and text Buttons —
// and the outlined border — is the exact resolved `neutral_<accent>` swatch
// (fg2 for secondary), never the readability-adjusted/desaturated `main`
// text role. The user expressly accepts that this ink can sit below 4.5:1
// against the page and paper in some variants: these tests deliberately do
// NOT gate contrast for those states (no ≥ 4.5 assertion on the resting
// outlined/text ink); they pin the exact raw swatch so no blended
// substitute or role drift can sneak in. Measured contrast of the default
// palette (getContrastRatio, unrounded), for the record: dark/medium
// primary ink #af5728 vs bg0 #2b2926 = 2.9305555555555554 (vs paper
// #3c3832 = 2.3444444444444446); light/medium vs bg0 #f3ecdd =
// 4.232227488151659 (vs paper #dbd2c2 = 3.3175355450236967); dark/hard
// vs bg0_hard #212120 = 3.246153846153846 (vs paper #4e463c =
// 1.8672566371681418); light/hard vs bg0_hard #fdfaf1 = 4.7677725118483405
// (vs paper #c5bdb0 = 2.6729857819905214); worst observed state:
// light/soft warning ink #d3a13d vs paper #dbd2c2 = 1.5659955257270695
// (vs bg #e7e0d0 = 1.7874720357941836). Full measured table for all six
// variants and colors lives in the change report. No accessibility claim
// is made for these resting states.

describe('outlined/text resting ink pinned to the raw resolved swatch', () => {
  it('custom neutral_orange/neutral_blue overrides reach outlined and text resting ink/border verbatim (dark/medium)', () => {
    const defaults = parseProjectDefaults(
      JSON.parse(readFileSync(path.resolve(__dirname, '../../palette/project-defaults.json'), 'utf8')),
    );
    const OVERRIDE_ORANGE = '#ff00ff';
    const OVERRIDE_BLUE = '#00ff00';
    const resolved = resolvePalette({
      baseColors: defaults.palettes.dark.baseColors,
      overrides: { ...defaults.palettes.dark.overrides, neutral_orange: OVERRIDE_ORANGE, neutral_blue: OVERRIDE_BLUE },
      mode: 'dark',
      contrast: 'medium',
    });
    const theme = buildMuiTheme(resolved, 'dark', 'medium');
    const nodes = createElement(
      'div',
      null,
      ...(['outlined', 'text', 'contained'] as const).flatMap((variant) =>
        (['primary', 'info', 'secondary'] as const).map((color) =>
          createElement(Button, { key: `${variant}-${color}`, variant, color }, `o-${variant}-${color}`),
        ),
      ),
    );
    const { html, rules } = renderButtons(theme, nodes);

    // OUTLINED: resting ink and border are the overridden swatch verbatim.
    const outlinedPrimary = rulesForElement(rules, buttonClassesForLabel(html, 'o-outlined-primary'));
    expect(effectiveValue(outlinedPrimary, 'rest', '--variant-outlinedColor'), 'outlined primary rest ink').toBe(OVERRIDE_ORANGE);
    expect(effectiveValue(outlinedPrimary, 'rest', '--variant-outlinedBorder'), 'outlined primary rest border').toBe(OVERRIDE_ORANGE);
    const outlinedInfo = rulesForElement(rules, buttonClassesForLabel(html, 'o-outlined-info'));
    expect(effectiveValue(outlinedInfo, 'rest', '--variant-outlinedColor'), 'outlined info rest ink').toBe(OVERRIDE_BLUE);
    expect(effectiveValue(outlinedInfo, 'rest', '--variant-outlinedBorder'), 'outlined info rest border').toBe(OVERRIDE_BLUE);

    // TEXT: resting ink is the overridden swatch verbatim.
    const textPrimary = rulesForElement(rules, buttonClassesForLabel(html, 'o-text-primary'));
    expect(effectiveValue(textPrimary, 'rest', '--variant-textColor'), 'text primary rest ink').toBe(OVERRIDE_ORANGE);
    const textSecondary = rulesForElement(rules, buttonClassesForLabel(html, 'o-text-secondary'));
    expect(effectiveValue(textSecondary, 'rest', '--variant-textColor'), 'text secondary rest ink (fg2 role)').toBe(resolved.fg2);

    // FILLED (contained) rendering unchanged: same raw-swatch fill role it
    // already used — the override flows through the SAME role, label ≥ 4.5:1
    // on that actual fill, and the hover still lifts to the exact bright
    // swatch with its recomputed label.
    const containedPrimary = rulesForElement(rules, buttonClassesForLabel(html, 'o-contained-primary'));
    const restBg = effectiveValue(containedPrimary, 'rest', '--variant-containedBg');
    expect(restBg, 'contained primary rest fill = raw overridden swatch').toBe(OVERRIDE_ORANGE);
    const restLabel = effectiveValue(containedPrimary, 'rest', '--variant-containedColor');
    expect(getContrastRatio(restLabel!, restBg!), 'contained primary rest label ≥ 4.5:1 on the overridden fill').toBeGreaterThanOrEqual(4.5);
    expect(effectiveValue(containedPrimary, 'hover', 'background-color'), 'contained primary hover fill = bright swatch').toBe(resolved.bright_orange);
    const hoverLabel = effectiveValue(containedPrimary, 'hover', 'color');
    expect(getContrastRatio(hoverLabel!, resolved.bright_orange), 'contained primary hover label ≥ 4.5:1 on bright fill').toBeGreaterThanOrEqual(4.5);

    // OUTLINED hover unchanged: solid bright fill, ink/border = the
    // recomputed hover ink (the strong bright-filled hover contract).
    expect(effectiveValue(outlinedPrimary, 'hover', 'background-color'), 'outlined primary hover fill = bright swatch').toBe(resolved.bright_orange);
    expect(effectiveValue(outlinedPrimary, 'hover', 'color'), 'outlined primary hover ink').toBe(getContrastRoles(resolved, 'dark', 'medium').accents.orange.lightContrastText);
    expect(effectiveValue(outlinedPrimary, 'hover', '--variant-outlinedBorder'), 'outlined primary hover border').toBe(getContrastRoles(resolved, 'dark', 'medium').accents.orange.lightContrastText);
  });

  it('disabled styling unchanged across all colors and variants (dark/medium)', () => {
    const { theme } = resolveRoles('dark', 'medium');
    const action = theme.palette.action;
    const nodes = createElement(
      'div',
      null,
      ...VARIANTS.flatMap((variant) =>
        COLORS.map((color) =>
          createElement(Button, { key: `${variant}-${color}`, variant, color, disabled: true }, `d-${variant}-${color}`),
        ),
      ),
    );
    const { html, rules } = renderButtons(theme, nodes);
    for (const variant of VARIANTS) {
      for (const color of COLORS) {
        const rulesFor = rulesForElement(rules, buttonClassesForLabel(html, `d-${variant}-${color}`));
        const disabledColor = effectiveValue(rulesFor, 'disabled', 'color');
        expect(disabledColor, `disabled ${variant} ${color} ink`).toBe(action.disabled);
        if (variant === 'contained') {
          expect(effectiveValue(rulesFor, 'disabled', 'background-color'), `disabled contained ${color} fill`).toBe(action.disabledBackground);
        }
        if (variant === 'outlined') {
          expect(effectiveValue(rulesFor, 'disabled', 'border'), `disabled outlined ${color} border`).toContain(action.disabledBackground);
        }
      }
    }
  });
});

// ── Outlined rest fill = the exact resolved `bg0` swatch, BOTH modes ──
//
// Explicit user direction: in BOTH modes the outlined Button's resting
// background is the exact resolved `bg0` palette swatch — NOT the
// per-contrast `roles.background` (soft/hard page backgrounds are
// `bg0_soft`/`bg0_hard`, other shades). Every semantic color (the six below)
// plus `inherit`, across all three contrasts. The raw neutral resting
// ink/border, the strong bright-tier hover fill/ink/border, the 1px
// bright_orange focus outline, contained/text behavior and the disabled
// ink/border are all asserted unchanged. Consequence reported, not hidden:
// a DISABLED outlined button also rests on `bg0` (MUI's disabled
// outlined rule repaints only ink and border, so the generic rest fill
// carries into the disabled state); its text/border/interactivity are
// unchanged, as asserted below. No contrast compensations are made or
// asserted (accepted user direction).

const OUTLINED_REST_COLORS = [...COLORS, 'inherit'] as const;

describe('outlined rest fill: resolved bg0 in BOTH modes (effective CSS)', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s outlined rest background: exact bg0 swatch in both modes',
    (mode, contrast) => {
      const { theme, resolved } = resolveRoles(mode, contrast);
      const nodes = createElement(
        'div',
        null,
        ...OUTLINED_REST_COLORS.map((color) =>
          createElement(Button, { key: `r-${color}`, variant: 'outlined', color }, `r-${color}`),
        ),
      );
      const { html, rules } = renderButtons(theme, nodes);
      for (const color of OUTLINED_REST_COLORS) {
        const classes = buttonClassesForLabel(html, `r-${color}`);
        const rulesFor = rulesForElement(rules, classes);
        const restBg = effectiveValue(rulesFor, 'rest', 'background-color');
        // BOTH modes rest on the exact resolved bg0 swatch — never
        // roles.background/roles.paper (soft/hard page backgrounds use
        // bg0_soft/bg0_hard, which are other shades).
        const restSwatch = resolved.bg0;
        if (color === 'inherit') {
          // Inherit rests through MUI's own var mechanism (see the theme
          // source): MUI's base `background-color: var(...)` declaration
          // survives intact and the inherit variant is the only rest setter
          // of the var — composed effective rest paint = the exact mode
          // swatch, while MUI's hover rule keeps a consumer to repaint.
          expect(restBg, `${mode}/${contrast} inherit outlined rest fill rides MUI's var`).toBe('var(--variant-outlinedBg)');
          expect(effectiveValue(rulesFor, 'rest', '--variant-outlinedBg'), `${mode}/${contrast} inherit outlined rest var = resolved bg0`).toBe(restSwatch);
        } else {
          expect(restBg, `${mode}/${contrast} ${color} outlined rest fill = resolved bg0`).toBe(restSwatch);
        }
      }
    },
  );

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s outlined hover contract intact on the new rest fill (semantic colors)',
    (mode, contrast) => {
      const { theme, resolved } = resolveRoles(mode, contrast);
      const themeRoles = getContrastRoles(resolved, mode, contrast);
      const nodes = createElement(
        'div',
        null,
        ...COLORS.map((color) => createElement(Button, { key: `h-${color}`, variant: 'outlined', color }, `h-${color}`)),
      );
      const { html, rules } = renderButtons(theme, nodes);
      for (const color of COLORS) {
        const accent = color === 'secondary'
          ? themeRoles.secondary
          : themeRoles.accents[COLOR_ACCENT[color as Exclude<typeof color, 'secondary'>]];
        const classes = buttonClassesForLabel(html, `h-${color}`);
        const rulesFor = rulesForElement(rules, classes);
        // Hover fill/ink/border: the strong bright-tier contract, unchanged —
        // in BOTH modes, on top of the bg0 rest fill.
        expect(effectiveValue(rulesFor, 'hover', 'background-color'), `${mode}/${contrast} ${color} outlined hover fill`).toBe(accent.light);
        expect(effectiveValue(rulesFor, 'hover', 'color'), `${mode}/${contrast} ${color} outlined hover ink`).toBe(accent.lightContrastText);
        expect(effectiveValue(rulesFor, 'hover', '--variant-outlinedBorder'), `${mode}/${contrast} ${color} outlined hover border`).toBe(accent.lightContrastText);
        // Resting ink/border: still the raw neutral swatch (fg2 for
        // secondary) — the rest fill did not touch the ink contract.
        const restSwatch = fillTiers(color, resolved).rest;
        expect(effectiveValue(rulesFor, 'rest', '--variant-outlinedColor'), `${mode}/${contrast} ${color} outlined rest ink`).toBe(restSwatch);
        expect(effectiveValue(rulesFor, 'rest', '--variant-outlinedBorder'), `${mode}/${contrast} ${color} outlined rest border`).toBe(restSwatch);
      }
    },
  );

  it.each(MODES)('%s disabled outlined buttons keep the disabled ink/border; the bg0 rest fill carries into the disabled state (reported)', (mode) => {
    const { theme } = resolveRoles(mode, 'medium');
    const action = theme.palette.action;
    const nodes = createElement(
      'div',
      null,
      ...OUTLINED_REST_COLORS.map((color) =>
        createElement(Button, { key: `do-${color}`, variant: 'outlined', color, disabled: true }, `do-${color}`),
      ),
    );
    const { html, rules } = renderButtons(theme, nodes);
    for (const color of OUTLINED_REST_COLORS) {
      const classes = buttonClassesForLabel(html, `do-${color}`);
      const rulesFor = rulesForElement(rules, classes);
      // Disabled ink/border: MUI's own disabled treatment, unchanged.
      expect(effectiveValue(rulesFor, 'disabled', 'color'), `disabled outlined ${color} ink`).toBe(action.disabled);
      if (color !== 'inherit') {
        expect(effectiveValue(rulesFor, 'disabled', 'border'), `disabled outlined ${color} border`).toContain(action.disabledBackground);
      }
      // The rest fill carries into disabled: no Mui-disabled rule declares a
      // background-color, so nothing repaints the fill — the rest
      // declaration (asserted above) is what the disabled button rests on.
      // Reported consequence of the generic rest fill in both modes,
      // accepted direction.
      expect(effectiveValue(rulesFor, 'disabled', 'background-color'), `disabled outlined ${color} fill untouched by disabled rules`).toBeUndefined();
    }
  });

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s inherit outlined: rest fill rides MUI\'s var, MUI\'s stock hover wash preserved, disabled carries the rest fill',
    (mode, contrast) => {
      const { theme, resolved } = resolveRoles(mode, contrast);
      const roles = getContrastRoles(resolved, mode, contrast);
      // MUI's own inherit hover wash: alpha(palette.text.primary,
      // palette.action.hoverOpacity) — computed with MUI's own alpha so the
      // assertion tracks MUI's actual emitted value, not a re-derivation.
      const wash = alpha(roles.text, theme.palette.action.hoverOpacity);
      const action = theme.palette.action;
      const nodes = createElement(
        'div',
        null,
        createElement(Button, { key: 'i', variant: 'outlined', color: 'inherit' }, 'i-inherit'),
        createElement(Button, { key: 'd', variant: 'outlined', color: 'inherit', disabled: true }, 'i-inherit-disabled'),
      );
      const { html, rules } = renderButtons(theme, nodes);
      for (const label of ['i-inherit', 'i-inherit-disabled']) {
        const rulesFor = rulesForElement(rules, buttonClassesForLabel(html, label));

        // REST: MUI's var-based base declaration is intact (not replaced by a
        // direct fill). The inherit variant is the only rest setter of the
        // var and holds the exact mode swatch — composed effective rest
        // paint = bg0 in BOTH modes.
        expect(effectiveValue(rulesFor, 'rest', 'background-color'), `${mode}/${contrast} inherit rest fill declaration = MUI's var`).toBe('var(--variant-outlinedBg)');
        expect(effectiveValue(rulesFor, 'rest', '--variant-outlinedBg'), `${mode}/${contrast} inherit rest var = resolved bg0`).toBe(resolved.bg0);

        // HOVER: MUI's stock inherit wash, in BOTH modes — no direct hover
        // background-color exists (which would mask the var, the regression
        // this guards), and the last hover var setter is the stock wash. In
        // dark it out-cascades the rest var through the :hover rule of the
        // same merged class chain (strictly higher specificity).
        expect(effectiveValue(rulesFor, 'hover', 'background-color'), `${mode}/${contrast} inherit: no direct hover fill`).toBeUndefined();
        expect(effectiveValue(rulesFor, 'hover', '--variant-outlinedBg'), `${mode}/${contrast} inherit hover var = MUI's stock wash`).toBe(wash);

        if (label === 'i-inherit-disabled') {
          // DISABLED: no Mui-disabled rule declares a fill or the var, so
          // nothing repaints the background — the rest fill (bg0 in both
          // modes) carries into the disabled state (reported
          // consequence of the generic rest fill). Ink stays MUI's disabled
          // treatment; the outlined disabled border rule is untouched.
          expect(effectiveValue(rulesFor, 'disabled', 'background-color'), `${mode}/${contrast} disabled inherit: no fill repaint`).toBeUndefined();
          expect(effectiveValue(rulesFor, 'disabled', '--variant-outlinedBg'), `${mode}/${contrast} disabled inherit: no var repaint`).toBeUndefined();
          expect(effectiveValue(rulesFor, 'disabled', 'color'), `${mode}/${contrast} disabled inherit ink`).toBe(action.disabled);
        }
      }
    },
  );

  it('custom dark and light bg0 overrides propagate to outlined rest fill and the exported MUI artifact (medium)', () => {
    const CUSTOM_BG0 = '#123456';
    const CUSTOM_LIGHT_BG0 = '#fedcba';
    const defaults = parseProjectDefaults(
      JSON.parse(readFileSync(path.resolve(__dirname, '../../palette/project-defaults.json'), 'utf8')),
    );
    const resolved = resolvePalette({
      baseColors: defaults.palettes.dark.baseColors,
      overrides: { ...defaults.palettes.dark.overrides, bg0: CUSTOM_BG0 },
      mode: 'dark',
      contrast: 'medium',
    });
    // bg0 is a pure bg-shade derivation (contrast-independent), so one
    // medium resolve stands for all three light variants — same as the
    // serializer, which resolves each mode once at medium.
    const lightResolved = resolvePalette({
      baseColors: defaults.palettes.light.baseColors,
      overrides: { ...defaults.palettes.light.overrides, bg0: CUSTOM_LIGHT_BG0 },
      mode: 'light',
      contrast: 'medium',
    });
    const theme = buildMuiTheme(resolved, 'dark', 'medium');
    const lightTheme = buildMuiTheme(lightResolved, 'light', 'medium');
    const nodes = createElement(
      'div',
      null,
      ...OUTLINED_REST_COLORS.map((color) =>
        createElement(Button, { key: `c-${color}`, variant: 'outlined', color }, `c-${color}`),
      ),
    );
    const { html, rules } = renderButtons(theme, nodes);
    for (const color of OUTLINED_REST_COLORS) {
      const classes = buttonClassesForLabel(html, `c-${color}`);
      const rulesFor = rulesForElement(rules, classes);
      if (color === 'inherit') {
        expect(effectiveValue(rulesFor, 'rest', 'background-color'), `custom bg0 → inherit rest fill rides MUI's var`).toBe('var(--variant-outlinedBg)');
        expect(effectiveValue(rulesFor, 'rest', '--variant-outlinedBg'), `custom bg0 → inherit rest var`).toBe(CUSTOM_BG0);
      } else {
        expect(effectiveValue(rulesFor, 'rest', 'background-color'), `custom bg0 → ${color} outlined rest fill`).toBe(CUSTOM_BG0);
      }
      // The ink contract is untouched by the bg override: raw neutral
      // swatches still drive ink/border (fg2 for secondary).
      if (color !== 'inherit') {
        const restSwatch = fillTiers(color as (typeof COLORS)[number], resolved).rest;
        expect(effectiveValue(rulesFor, 'rest', '--variant-outlinedColor'), `custom bg0 → ${color} outlined rest ink unchanged`).toBe(restSwatch);
      }
    }
    // Same propagation for the light bg0 override, live theme: every outlined
    // color rests on the custom swatch, inherit rides the var, raw neutral
    // ink/border untouched.
    const { html: lightHtml, rules: lightRules } = renderButtons(lightTheme, nodes);
    for (const color of OUTLINED_REST_COLORS) {
      const classes = buttonClassesForLabel(lightHtml, `c-${color}`);
      const rulesFor = rulesForElement(lightRules, classes);
      if (color === 'inherit') {
        expect(effectiveValue(rulesFor, 'rest', 'background-color'), `custom light bg0 → inherit rest fill rides MUI's var`).toBe('var(--variant-outlinedBg)');
        expect(effectiveValue(rulesFor, 'rest', '--variant-outlinedBg'), `custom light bg0 → inherit rest var`).toBe(CUSTOM_LIGHT_BG0);
      } else {
        expect(effectiveValue(rulesFor, 'rest', 'background-color'), `custom light bg0 → ${color} outlined rest fill`).toBe(CUSTOM_LIGHT_BG0);
      }
      if (color !== 'inherit') {
        const restSwatch = fillTiers(color as (typeof COLORS)[number], lightResolved).rest;
        expect(effectiveValue(rulesFor, 'rest', '--variant-outlinedColor'), `custom light bg0 → ${color} outlined rest ink unchanged`).toBe(restSwatch);
      }
    }

    // EXPORTED ARTIFACT: the standalone MUI export consumes the same shared
    // theme-options source, so a custom bg0 in either mode must appear as
    // the outlined rest fill in the generated options of every variant of
    // that mode (bg0 is contrast-independent, so one resolve covers
    // soft/medium/hard — exactly how the serializer resolves).
    const serialized = serializeMuiTheme({
      dark: { baseColors: defaults.palettes.dark.baseColors, overrides: { ...defaults.palettes.dark.overrides, bg0: CUSTOM_BG0 } },
      light: { baseColors: defaults.palettes.light.baseColors, overrides: { ...defaults.palettes.light.overrides, bg0: CUSTOM_LIGHT_BG0 } },
    });
    for (const mode of MODES) {
      for (const contrast of CONTRASTS) {
        const variant = `${mode}-${contrast}`;
        const marker = `  '${variant}': `;
        const startIdx = serialized.indexOf(marker);
        expect(startIdx, `${variant} options block present`).toBeGreaterThan(-1);
        const from = serialized.slice(startIdx + marker.length);
        // The block ends at the next two-space-quoted variant entry that
        // opens with `{` (options entries only — `sunfadeThemes` entries call
        // `createTheme(...)` and must not match) or at the column-0 `};`
        // closing `sunfadeThemeOptions`.
        const nextEntry = from.search(/\n {2}'(?:dark|light)-(?:soft|medium|hard)': \{/);
        const close = from.search(/\n\};/);
        const end = nextEntry === -1 ? close : nextEntry;
        expect(end, `${variant} options block terminated`).toBeGreaterThan(-1);
        const json = from.slice(0, end).trimEnd().replace(/,$/, '');
        const options = JSON.parse(json) as {
          components?: {
            MuiButton?: {
              variants?: Array<{ props: { variant?: string; color?: string }; style: Record<string, unknown> }>;
            };
          };
        };
        const outlinedVariants = (options.components?.MuiButton?.variants ?? []).filter((v) => v.props.variant === 'outlined');
        const customSwatch = mode === 'dark' ? CUSTOM_BG0 : CUSTOM_LIGHT_BG0;
        // Semantic colors rest on a direct fill; `inherit` rides MUI's var
        // (its hover is var-based and must keep a consumer) — in BOTH modes.
        const withDirect = outlinedVariants.filter((v) => 'backgroundColor' in v.style);
        expect(withDirect.map((v) => v.props.color).sort(), `${variant} exported outlined direct rest fills`).toEqual(
          ['error', 'info', 'primary', 'secondary', 'success', 'warning'],
        );
        for (const v of withDirect) {
          expect(v.style.backgroundColor, `${variant} ${v.props.color} exported rest fill`).toBe(customSwatch);
        }
        const withVar = outlinedVariants.filter((v) => '--variant-outlinedBg' in v.style);
        expect(withVar.map((v) => v.props.color), `${variant} exported outlined var rest fills`).toEqual(['inherit']);
        expect(withVar[0]?.style['--variant-outlinedBg'], `${variant} inherit exported rest var`).toBe(customSwatch);
      }
    }
  });
});

// ── Disabled and focus (all six variants, one representative color) ──

describe('button disabled and focus states', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s disabled buttons fall back to the neutral disabled ink, not the accent',
    (mode, contrast) => {
      const { theme } = resolveRoles(mode, contrast);
      const action = theme.palette.action;
      const nodes = createElement(
        'div',
        null,
        ...VARIANTS.map((variant) =>
          createElement(Button, { key: variant, variant, disabled: true }, `d-${variant}`),
        ),
      );
      const { html, rules } = renderButtons(theme, nodes);
      for (const variant of VARIANTS) {
        const classes = buttonClassesForLabel(html, `d-${variant}`);
        const rulesFor = rulesForElement(rules, classes);
        const color = effectiveValue(rulesFor, 'disabled', 'color');
        expect(color, `${mode}/${contrast} ${variant} disabled color`).toBe(action.disabled);
        if (variant === 'contained') {
          const bg = effectiveValue(rulesFor, 'disabled', 'background-color');
          expect(bg, `${mode}/${contrast} ${variant} disabled bg`).toBe(action.disabledBackground);
        }
        if (variant === 'outlined') {
          const border = effectiveValue(rulesFor, 'disabled', 'border');
          expect(border, `${mode}/${contrast} ${variant} disabled border`).toContain(action.disabledBackground);
        }
      }
    },
  );

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s focus ring is the exact bright_orange palette swatch',
    (mode, contrast) => {
      const { resolved } = resolveRoles(mode, contrast);
      // Explicit user direction: keyboard focus renders with the exact
      // `bright_orange` palette swatch — not the former bg0_hard swatch, no
      // substitute color, and no compensating second ring. This is a
      // knowingly imperfect treatment: in the light variants the orange line
      // sits below 3:1 against every surface tier, and in every mode it
      // vanishes against the bright-orange hover fill of primary controls
      // (orange on orange); dark mode sits near or above 3:1 against the
      // page background. Accepted by the user; it is NOT
      // accessibility-compliant and no WCAG claim is made for it. Asserted
      // exactly so no other change moves it silently.
      const expected = resolved.bright_orange;
      const nodes = createElement(
        'div',
        null,
        ...VARIANTS.map((variant) => createElement(Button, { key: variant, variant }, `f-${variant}`)),
      );
      const { theme } = resolveRoles(mode, contrast);
      const { html, rules } = renderButtons(theme, nodes);
      for (const variant of VARIANTS) {
        const classes = buttonClassesForLabel(html, `f-${variant}`);
        const rulesFor = rulesForElement(rules, classes);
        const outline = effectiveValue(rulesFor, 'focus', 'outline');
        expect(outline, `${mode}/${contrast} ${variant} focus outline`).toContain(expected);
      }
    },
  );
});

// ── Flat elevation: no contained shadow in any state (effective CSS) ──
//
// The flat theme removes MUI's contained-button elevation entirely: MUI's
// contained variant paints shadows[2] at rest, shadows[4] on hover,
// shadows[8] on :active, shadows[6] on .Mui-focusVisible, resets to
// shadows[2] under @media (hover: none) (touch), and shadows[0] when
// disabled. Every one of those is pinned to none by the theme; this suite
// reads the effective cascaded box-shadow per state so a future MUI rule or
// theme edit cannot reintroduce elevation silently. The 1px bright_orange
// focus outline contract is asserted separately above and is not part of
// this shadow check.

describe('flat button elevation (effective CSS)', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s contained button: no box-shadow at rest, hover, active, keyboard focus, touch or disabled',
    (mode, contrast) => {
      const { theme } = resolveRoles(mode, contrast);
      const nodes = createElement(
        'div',
        null,
        createElement(Button, { key: 'c', variant: 'contained' }, 'e-contained'),
        createElement(Button, { key: 'd', variant: 'contained', disabled: true }, 'e-contained-disabled'),
      );
      const { html, rules } = renderButtons(theme, nodes);

      for (const label of ['e-contained', 'e-contained-disabled']) {
        const classes = buttonClassesForLabel(html, label);
        const rulesFor = rulesForElement(rules, classes);
        // .Mui-disabled / .Mui-focusVisible are applied at runtime and are
        // not in the static HTML class list; the disabled state is therefore
        // asserted on the actually disabled element (whose class list does
        // carry Mui-disabled) and the focus state is matched by selector
        // across all emitted rules, like the filled-input focus test below.
        const states: readonly ('rest' | 'hover' | 'active' | 'disabled')[] = (label === 'e-contained'
          ? ['rest', 'hover', 'active']
          : ['rest', 'disabled']);
        for (const state of states) {
          expect(effectiveValue(rulesFor, state, 'box-shadow'), `${mode}/${contrast} ${label} ${state} box-shadow`).toBe('none');
        }
        // Touch: under @media (hover: none) — MUI's own touch reset — the
        // LAST :hover box-shadow declaration wins; ours pins none after
        // MUI's shadows[2] reset.
        const touchShadow = rulesFor
          .filter((rule) => rule.media.includes('hover: none') && /:hover/.test(rule.selector))
          .map((rule) => rule.declarations['box-shadow'])
          .filter((v): v is string => v !== undefined)
          .pop();
        expect(touchShadow, `${mode}/${contrast} ${label} touch box-shadow`).toBe('none');
        // Keyboard focus: .Mui-focusVisible is applied at runtime and is not
        // in the static HTML class list, so — like the filled-input focus
        // test below — the focus rules are matched by selector across all
        // emitted rules; MUI's own shadows[6] rule emits first, our 'none'
        // pin later, and the LAST declaration wins the cascade.
        const focusShadow = rules
          .filter((rule) => /Mui-focusVisible/.test(rule.selector) && /MuiButton-root/.test(rule.selector))
          .map((rule) => rule.declarations['box-shadow'])
          .filter((v): v is string => v !== undefined)
          .pop();
        expect(focusShadow, `${mode}/${contrast} ${label} focus box-shadow`).toBe('none');
      }
    },
  );
});

// ── Filled input keyboard focus (effective CSS, all six variants) ──

describe('filled input keyboard focus states', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s focused filled input: bright_orange focus border on the lifted tier, distinct from rest and hover',
    (mode, contrast) => {
      const { theme, resolved } = resolveRoles(mode, contrast);
      const roles = getContrastRoles(resolved, mode, contrast);
      const nodes = createElement(
        'div',
        null,
        createElement(TextField, { key: 'filled', variant: 'filled', defaultValue: 'x-filled-input', 'aria-label': 'filled input' }),
      );
      const { html, rules } = renderButtons(theme, nodes);

      const classMatch = /class="([^"]*MuiFilledInput-root[^"]*)"/.exec(html);
      expect(classMatch, 'filled input rendered').not.toBeNull();
      const classList = classMatch![1].split(/\s+/);
      const rulesFor = rulesForElement(rules, classList);

      // REST: standing 1px boundary in the frame color — the input edge.
      const restBorder = effectiveValue(rulesFor, 'rest', 'border');
      expect(restBorder, `${mode}/${contrast} filled rest border`).toBe(`1px solid ${roles.frame}`);

      // FOCUS: the .Mui-focused rules must carry the shared focus treatment —
      // the exact bright_orange palette swatch (see the theme's focusColor)
      // — plus the lifted fill, an obvious cue that differs from both the
      // rest border and the hover treatment (hover keeps the frame border).
      // The element does not carry Mui-focused in static HTML, so focus rules
      // are matched by selector across all emitted rules; MUI's own defaults
      // are emitted before our overrides, so the LAST matching declaration
      // wins the cascade.
      const focusRules = rules.filter((rule) => /Mui-focused/.test(rule.selector) && /MuiFilledInput-root/.test(rule.selector));
      expect(focusRules.length, `${mode}/${contrast} focused rules emitted`).toBeGreaterThan(0);
      let borderColor: string | undefined;
      let backgroundColor: string | undefined;
      for (const rule of focusRules) {
        if (rule.media.includes('hover: none')) continue;
        if ('border-color' in rule.declarations) borderColor = rule.declarations['border-color'];
        if ('background-color' in rule.declarations) backgroundColor = rule.declarations['background-color'];
      }
      expect(borderColor, `${mode}/${contrast} focused border color`).toBe(resolved.bright_orange);
      expect(backgroundColor, `${mode}/${contrast} focused fill`).toBe(roles.inputHover);
      expect(borderColor).not.toBe(roles.frame);

      // NOTE: no non-text contrast assertion is made for the focused border —
      // by explicit user direction the focus color is the raw bright_orange
      // swatch, which sits below 3:1 against the lifted fill and the paper in
      // the light variants and vanishes against the orange hover tier. The
      // low contrast is accepted; no accessibility claim is made.
    },
  );
});

// ── Toggle button group borders (effective CSS) ──────────────────────
//
// Toggle buttons draw their MUI-default border from `palette.divider` — the
// same role that paints Divider components, table rules and the sx
// `borderColor: 'divider'` shorthand. That border must be the themed border
// color (the frame tone) in every variant; the reported bug was toggle-group
// borders reading as inconsistent grey. Rendered through the real Emotion
// engine, like the button tests above.

describe('toggle button group borders', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s group buttons carry the themed frame border at rest',
    (mode, contrast) => {
      const { theme, resolved } = resolveRoles(mode, contrast);
      const roles = getContrastRoles(resolved, mode, contrast);
      const nodes = createElement(
        'div',
        null,
        createElement(
          ToggleButtonGroup,
          { exclusive: true, size: 'small', fullWidth: true, 'aria-label': 'group border' },
          createElement(ToggleButton, { key: 'a', value: 'a' }, 'x-toggle-a'),
          createElement(ToggleButton, { key: 'b', value: 'b' }, 'x-toggle-b'),
        ),
      );
      const { html, rules } = renderButtons(theme, nodes);
      for (const label of ['x-toggle-a', 'x-toggle-b']) {
        const classes = buttonClassesForLabel(html, label);
        const rulesFor = rulesForElement(rules, classes);
        const border = effectiveValue(rulesFor, 'rest', 'border');
        expect(border, `${mode}/${contrast} ${label} rest border`).toBe(`1px solid ${roles.frame}`);
      }
    },
  );
});

// Sanity: createTheme is imported but only used to keep the Theme type honest.
expect(typeof createTheme).toBe('function');
