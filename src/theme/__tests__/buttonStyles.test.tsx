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
import { Button } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { getContrastRatio, createTheme } from '@mui/material/styles';
import { TextField } from '@mui/material';
import { beforeAll, describe, expect, it } from 'vitest';

import { parseProjectDefaults } from '../../palette/project-defaults';
import { resolvePalette } from '../../palette/resolver';
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

function isState(rule: CssRule, state: 'rest' | 'hover' | 'focus' | 'disabled'): boolean {
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
function effectiveValue(rules: CssRule[], state: 'rest' | 'hover' | 'focus' | 'disabled', property: string): string | undefined {
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

/** MUI palette color → Sunfade accent name (mirrors the shared theme source). */
const COLOR_ACCENT: Record<(typeof COLORS)[number], AccentName> = {
  primary: 'blue',
  secondary: 'purple',
  error: 'red',
  warning: 'yellow',
  success: 'green',
  info: 'aqua',
};

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
      const accent = COLOR_ACCENT[color];
      const roles = capture.theme.palette as never as Record<string, { main: string; light: string; dark: string; contrastText: string; lightContrastText: string }>;
      const palette = roles[color];
      const classes = capture.classOf[`contained-${color}`];
      const rules = rulesForElement(capture.rules, classes);

      // REST FILL: the emitted variable must be the RAW neutral swatch — the
      // user's exact color, never a readability-adjusted text role.
      const restBg = effectiveValue(rules, 'rest', '--variant-containedBg');
      expect(restBg, `${mode}/${contrast} ${color} rest fill`).toBe(capture.resolved[`neutral_${accent}`]);

      // REST LABEL: the ink must be ≥ 4.5:1 on that actual fill.
      const restColor = effectiveValue(rules, 'rest', '--variant-containedColor');
      expect(restColor, `${mode}/${contrast} ${color} rest label`).toBeDefined();
      expect(getContrastRatio(restColor!, restBg!), `${mode}/${contrast} ${color} rest label ≥ 4.5:1 on raw neutral fill`).toBeGreaterThanOrEqual(4.5);

      // HOVER FILL: the last background-color declaration among hover rules
      // must be the RAW bright swatch (this is what actually paints the
      // button — it wins over MUI's default hover variable that darkens to
      // palette[color].dark).
      const hoverBg = effectiveValue(rules, 'hover', 'background-color');
      expect(hoverBg, `${mode}/${contrast} ${color} hover fill`).toBe(capture.resolved[`bright_${accent}`]);

      // HOVER LABEL: the ink must be ≥ 4.5:1 on that actual bright fill.
      const hoverColor = effectiveValue(rules, 'hover', 'color');
      expect(hoverColor, `${mode}/${contrast} ${color} hover label`).toBeDefined();
      expect(getContrastRatio(hoverColor!, hoverBg!), `${mode}/${contrast} ${color} hover label ≥ 4.5:1 on raw bright fill`).toBeGreaterThanOrEqual(4.5);

      // MUI's default hover still darkens the variable underneath; our bright
      // fill must win, so it must be declared after that default rule.
      const defaultHoverVar = effectiveValue(rules, 'hover', '--variant-containedBg');
      expect(defaultHoverVar).toBe(palette.dark);
    });

    it.each(COLORS)('%s outlined: border tracks text color at rest and on hover', (color) => {
      const roles = capture.theme.palette as never as Record<string, { main: string; light: string }>;
      const palette = roles[color];
      const classes = capture.classOf[`outlined-${color}`];
      const rules = rulesForElement(capture.rules, classes);

      const restBorder = effectiveValue(rules, 'rest', '--variant-outlinedBorder');
      const restText = effectiveValue(rules, 'rest', '--variant-outlinedColor');
      expect(restBorder).toBe(palette.main);
      expect(restText).toBe(palette.main);
      expect(restBorder).toBe(restText);

      const hoverBorder = effectiveValue(rules, 'hover', '--variant-outlinedBorder');
      expect(hoverBorder).toBe(palette.main);
    });

    it.each(COLORS)('%s text: no border at all', (color) => {
      const classes = capture.classOf[`text-${color}`];
      const rules = rulesForElement(capture.rules, classes);
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
    '%s/%s focus ring keeps the shared blue accent outline',
    (mode, contrast) => {
      const { theme } = resolveRoles(mode, contrast);
      const expected = (theme.palette as never as Record<string, { main: string }>).primary.main;
      const nodes = createElement(
        'div',
        null,
        ...VARIANTS.map((variant) => createElement(Button, { key: variant, variant }, `f-${variant}`)),
      );
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

// ── Filled input keyboard focus (effective CSS, all six variants) ──

describe('filled input keyboard focus states', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s focused filled input: accent border on the lifted tier, distinct from rest and hover',
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

      // FOCUS: the .Mui-focused rules must carry the independent blue accent
      // border and the lifted fill — an obvious cue that differs from both
      // the rest border and the hover treatment (hover keeps the frame
      // border). The element does not carry Mui-focused in static HTML, so
      // focus rules are matched by selector across all emitted rules; MUI's
      // own defaults are emitted before our overrides, so the LAST matching
      // declaration wins the cascade.
      const focusRules = rules.filter((rule) => /Mui-focused/.test(rule.selector) && /MuiFilledInput-root/.test(rule.selector));
      expect(focusRules.length, `${mode}/${contrast} focused rules emitted`).toBeGreaterThan(0);
      let borderColor: string | undefined;
      let backgroundColor: string | undefined;
      for (const rule of focusRules) {
        if (rule.media.includes('hover: none')) continue;
        if ('border-color' in rule.declarations) borderColor = rule.declarations['border-color'];
        if ('background-color' in rule.declarations) backgroundColor = rule.declarations['background-color'];
      }
      expect(borderColor, `${mode}/${contrast} focused border color`).toBe(roles.accents.blue.main);
      expect(backgroundColor, `${mode}/${contrast} focused fill`).toBe(roles.inputHover);
      expect(borderColor).not.toBe(roles.frame);

      // The focus pair clears 3:1 non-text contrast on its actual surfaces.
      expect(getContrastRatio(roles.accents.blue.main, roles.inputHover), `${mode}/${contrast} focus border vs fill`).toBeGreaterThanOrEqual(3);
      expect(getContrastRatio(roles.accents.blue.main, roles.paper), `${mode}/${contrast} focus border vs paper`).toBeGreaterThanOrEqual(3);
    },
  );
});

// Sanity: createTheme is imported but only used to keep the Theme type honest.
expect(typeof createTheme).toBe('function');
