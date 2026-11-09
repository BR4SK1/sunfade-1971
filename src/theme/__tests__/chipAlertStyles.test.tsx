// Effective-styling regression tests for Sunfade MUI chips and filled alerts.
//
// The user-visible bug this guards: the theme's chip/alert overrides used
// combined class selectors (`MuiChip-filledPrimary`, `MuiAlert-filledError`)
// that the installed MUI never emits — it puts the color (`MuiChip-colorX` /
// `MuiAlert-colorX`) and the fill variant (`MuiChip-filled` / `MuiAlert-filled`)
// on the element as two separate classes — so those overrides were dead CSS
// and MUI's own defaults painted the fills (the readability-adjusted `main`
// on chips, the darker tier with a bare black ink on alerts). These tests
// render real components through the Emotion engine MUI uses
// (CacheProvider + renderToString), capture the emitted CSS, and assert the
// effective cascaded values across all six variants — including that the
// fills follow the shared fill model (the raw neutral swatch with its own
// label ink at rest, the bright tier on hover) rather than a text role.
//
// Limitations: no headless browser is available in this environment, so hover
// is verified at the emitted-CSS level (rule order + @media tracking), like
// buttonStyles.test.tsx.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import createCache from '@emotion/cache';
import { CacheProvider, ThemeProvider } from '@emotion/react';
import { Alert, Chip } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { getContrastRatio } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import { parseProjectDefaults } from '../../palette/project-defaults';
import { resolvePalette } from '../../palette/resolver';
import type { AccentName, Contrast, Mode, ResolvedPalette } from '../../palette/types';
import { buildMuiTheme } from '../buildMuiTheme';
import { getContrastRoles } from '../contrastRoles';

// ── Captured CSS machinery (lean variant of buttonStyles.test.tsx) ──

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
      // @keyframes / @font-face / etc — not needed for chip/alert assertions.
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

/** Rules whose first compound selector only carries classes that are on the
 * element (descendant rules for other elements are excluded). */
function rulesForElement(rules: CssRule[], classList: string[]): CssRule[] {
  return rules.filter((rule) => {
    const classes = firstCompoundClasses(rule.selector);
    return classes.length > 0 && classes.every((c) => classList.includes(c.slice(1)));
  });
}

/** Own-element rules only: rulesForElement plus exclusion of DESCENDANT rules
 * (`.root .child`) whose declarations do not style the element itself — e.g.
 * the avatar/deleteIcon child color rules must not be read as the root ink. */
function ownElementRules(rules: CssRule[], classList: string[]): CssRule[] {
  return rulesForElement(rules, classList).filter((rule) => !/\s/.test(rule.selector));
}

/** The LAST rest-state declaration wins at equal specificity — MUI defaults
 * emit first. Rest excludes hover/active/focus/disabled pseudo-state rules. */
function lastRestDeclaration(rules: CssRule[], property: string): string | undefined {
  let value: string | undefined;
  let bestOrder = -1;
  for (const rule of rules) {
    if (/:hover|:active|:focus|Mui-disabled|Mui-focusVisible/.test(rule.selector)) continue;
    if (property in rule.declarations && rule.order > bestOrder) {
      value = rule.declarations[property];
      bestOrder = rule.order;
    }
  }
  return value;
}

/** Effective hover background: the last :hover declaration wrapped in
 * @media (hover: hover) — the same convention the theme's buttons use. */
function effectiveHover(rules: CssRule[], property: string): string | undefined {
  let value: string | undefined;
  let bestOrder = -1;
  for (const rule of rules) {
    if (!rule.selector.includes(':hover')) continue;
    if (rule.media && !rule.media.includes('hover: hover')) continue;
    if (property in rule.declarations && rule.order > bestOrder) {
      value = rule.declarations[property];
      bestOrder = rule.order;
    }
  }
  return value;
}

// ── Theme setup ─────────────────────────────────────────────────────

const MODES: readonly Mode[] = ['dark', 'light'];
const CONTRASTS: readonly Contrast[] = ['soft', 'medium', 'hard'];

const CHIP_COLORS = ['primary', 'secondary', 'error', 'warning', 'success', 'info'] as const;
const ALERT_SEVERITIES = ['error', 'warning', 'success', 'info'] as const;

/** MUI color/severity → raw resolved swatches for its rest and hover fills
 * (mirrors the shared theme source; secondary is fg-family chrome). */
const ACCENT_BY_CHIP_COLOR: Record<Exclude<(typeof CHIP_COLORS)[number], 'secondary'>, AccentName> = {
  primary: 'orange',
  error: 'red',
  warning: 'yellow',
  success: 'green',
  info: 'blue',
};

function fillTiers(color: (typeof CHIP_COLORS)[number], resolved: ResolvedPalette): { rest: string; hover: string } {
  if (color === 'secondary') return { rest: resolved.fg2, hover: resolved.fg1 };
  return { rest: resolved[`neutral_${ACCENT_BY_CHIP_COLOR[color]}`], hover: resolved[`bright_${ACCENT_BY_CHIP_COLOR[color]}`] };
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
  return { theme: buildMuiTheme(resolved, mode, contrast), resolved, roles: getContrastRoles(resolved, mode, contrast) };
}

// ── Rendering ───────────────────────────────────────────────────────

interface Capture {
  html: string;
  rules: CssRule[];
  classOf: Record<string, string[]>;
}

/** Class list of the innermost enclosing div whose class marks the component
 * root (`MuiChip-root` / `MuiAlert-root`): the label sits inside a nested
 * element (chip label span, alert message div), so the scan walks backwards
 * through opening tags until it reaches the root. */
function rootClasses(html: string, label: string, rootClass: string): string[] {
  let pos = html.indexOf(label);
  expect(pos, `${label} rendered`).toBeGreaterThan(-1);
  for (;;) {
    const open = html.lastIndexOf('<div', pos);
    expect(open, `${label} enclosing div`).toBeGreaterThan(-1);
    const tag = html.slice(open, html.indexOf('>', open) + 1);
    const cm = /class="([^"]*)"/.exec(tag);
    if (cm && cm[1].includes(rootClass)) return cm[1].split(/\s+/);
    pos = open - 1;
  }
}

function renderChipAlerts(theme: Theme): Capture {
  const cache = createCache({ key: 'sfchip' });
  const nodes = createElement(
    'div',
    null,
    ...CHIP_COLORS.map((color) => createElement(Chip, { key: `filled-${color}`, label: `x-filled-${color}`, color }, `x-filled-${color}`)),
    ...ALERT_SEVERITIES.map((severity) =>
      createElement(Alert, { key: severity, severity, variant: 'filled' }, `x-alert-${severity}`)),
  );
  const html = renderToString(
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>{nodes}</ThemeProvider>
    </CacheProvider>,
  );
  const rules: CssRule[] = [];
  for (const m of html.matchAll(/<style data-emotion="[^"]*">([\s\S]*?)<\/style>/g)) {
    flattenCss(m[1], '', rules);
  }
  const classOf: Record<string, string[]> = {};
  for (const color of CHIP_COLORS) {
    classOf[`chip-${color}`] = rootClasses(html, `x-filled-${color}`, 'MuiChip-root');
  }
  for (const severity of ALERT_SEVERITIES) {
    classOf[`alert-${severity}`] = rootClasses(html, `x-alert-${severity}`, 'MuiAlert-root');
  }
  return { html, rules, classOf };
}

// ── The regression suite ────────────────────────────────────────────

describe('filled chips (effective CSS)', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s filled color chips rest on the raw neutral fill and lift to the bright tier',
    (mode, contrast) => {
      const { theme, resolved } = resolveRoles(mode, contrast);
      const { rules, classOf } = renderChipAlerts(theme);

      for (const color of CHIP_COLORS) {
        const classes = classOf[`chip-${color}`];
        // Selector reality check: MUI emits the color and the fill variant as
        // TWO separate classes on the root — the combined `filledX` classes
        // the theme used to target do not exist.
        expect(classes, `${mode}/${contrast} ${color} color class`).toContain(`MuiChip-color${color[0].toUpperCase()}${color.slice(1)}`);
        expect(classes, `${mode}/${contrast} ${color} filled class`).toContain('MuiChip-filled');

        const tiers = fillTiers(color, resolved);
        const elementRules = ownElementRules(rules, classes);

        // REST FILL: the raw neutral swatch wins over MUI's own color fill
        // (the readability-adjusted main — a text role, never a fill).
        const restBg = lastRestDeclaration(elementRules, 'background-color');
        expect(restBg, `${mode}/${contrast} ${color} rest fill`).toBe(tiers.rest);

        // REST INK: the label computed for that raw fill, ≥ 4.5:1 on it.
        const restColor = lastRestDeclaration(elementRules, 'color');
        expect(restColor, `${mode}/${contrast} ${color} rest ink`).toBeDefined();
        expect(getContrastRatio(restColor!, restBg!), `${mode}/${contrast} ${color} rest ink on fill`).toBeGreaterThanOrEqual(4.5);

        // HOVER: the bright tier with its recomputed ink, ≥ 4.5:1.
        const hoverBg = effectiveHover(elementRules, 'background-color');
        expect(hoverBg, `${mode}/${contrast} ${color} hover fill`).toBe(tiers.hover);
        const hoverColor = effectiveHover(elementRules, 'color');
        expect(hoverColor, `${mode}/${contrast} ${color} hover ink`).toBeDefined();
        expect(getContrastRatio(hoverColor!, hoverBg!), `${mode}/${contrast} ${color} hover ink on fill`).toBeGreaterThanOrEqual(4.5);

        // NO BORDER on filled chips: MUI's base `border: 0` stands — the
        // fill carries the chip and the former 1px frame stroke around a
        // solid fill was removed (outlines live on the outlined variants
        // only, asserted in their own suite below).
        const border = lastRestDeclaration(elementRules, 'border');
        expect(border === undefined || border === '0', `${mode}/${contrast} ${color} filled chip border must be absent/0, got ${border}`).toBe(true);
      }
    },
  );

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s outlined chip consumer color override keeps border on currentColor',
    (mode, contrast) => {
      const { theme } = resolveRoles(mode, contrast);
      const cache = createCache({ key: 'sfchipovr' });
      const nodes = createElement(Chip, {
        label: 'x-overridden-chip',
        variant: 'outlined',
        color: 'primary',
        sx: { color: '#123456' },
      });
      const html = renderToString(
        <CacheProvider value={cache}>
          <ThemeProvider theme={theme}>{nodes}</ThemeProvider>
        </CacheProvider>,
      );
      const rules: CssRule[] = [];
      for (const m of html.matchAll(/<style data-emotion="[^"]*">([\s\S]*?)<\/style>/g)) {
        flattenCss(m[1], '', rules);
      }
      const classes = rootClasses(html, 'x-overridden-chip', 'MuiChip-root');
      const elementRules = ownElementRules(rules, classes);
      // The override repaints the INK only; the border declaration stays on
      // the theme's currentColor pin, so at runtime the border follows the
      // overridden ink (browser-verified in the palette-lab harness).
      const border = lastRestDeclaration(elementRules, 'border');
      expect(border, `${mode}/${contrast} overridden border stays currentColor`).toBe('1px solid currentColor');
      const overriddenInk = elementRules
        .filter((rule) => rule.declarations['color'] === '#123456')
        .map((rule) => rule.declarations['color']);
      expect(overriddenInk.length, `${mode}/${contrast} sx ink override emitted`).toBeGreaterThan(0);
      // No rule may repaint the border to the literal overridden hex — the
      // whole point of currentColor is that consumers only need to set color.
      for (const rule of elementRules) {
        for (const prop of ['border', 'border-color'] as const) {
          if (prop in rule.declarations && rule.declarations[prop] !== '1px solid currentColor') {
            expect(rule.declarations[prop], `${mode}/${contrast} unexpected border repaint`).toBeUndefined();
          }
        }
      }
    },
  );

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s no dead combined chip classes are emitted',
    (mode, contrast) => {
      const { theme } = resolveRoles(mode, contrast);
      const { rules } = renderChipAlerts(theme);
      const dead = rules.filter((rule) => /MuiChip-filled(Primary|Secondary|Error|Warning|Success|Info)\b/.test(rule.selector));
      expect(dead.map((rule) => rule.selector), `${mode}/${contrast} dead chip selectors`).toEqual([]);
    },
  );
});

describe('filled alerts (effective CSS)', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s filled alerts carry the raw neutral fill with its own label ink',
    (mode, contrast) => {
      const { theme, resolved, roles } = resolveRoles(mode, contrast);
      const { rules, classOf } = renderChipAlerts(theme);

      for (const severity of ALERT_SEVERITIES) {
        const classes = classOf[`alert-${severity}`];
        // Selector reality check: MUI emits `MuiAlert-colorX` + `MuiAlert-filled`,
        // never the combined `MuiAlert-filledX`.
        expect(classes, `${mode}/${contrast} ${severity} color class`).toContain(`MuiAlert-color${severity[0].toUpperCase()}${severity.slice(1)}`);
        expect(classes, `${mode}/${contrast} ${severity} filled class`).toContain('MuiAlert-filled');

        const accent = resolved[`neutral_${severity === 'error' ? 'red' : severity === 'warning' ? 'yellow' : severity === 'success' ? 'green' : 'blue'}`];
        const elementRules = ownElementRules(rules, classes);

        // FILL: the raw neutral swatch wins over MUI's own darker-tier fill.
        const bg = lastRestDeclaration(elementRules, 'background-color');
        expect(bg, `${mode}/${contrast} ${severity} fill`).toBe(accent);

        // INK: the label computed for that raw fill, ≥ 4.5:1 on it — not the
        // bare rgba(0,0,0,0.87) MUI pairs with its darker fill.
        const color = lastRestDeclaration(elementRules, 'color');
        expect(color, `${mode}/${contrast} ${severity} ink`).toBeDefined();
        expect(color, `${mode}/${contrast} ${severity} ink is the computed label`).toBe(
          roles.accents[severity === 'error' ? 'red' : severity === 'warning' ? 'yellow' : severity === 'success' ? 'green' : 'blue'].neutralFillLabel,
        );
        expect(getContrastRatio(color!, bg!), `${mode}/${contrast} ${severity} ink on fill`).toBeGreaterThanOrEqual(4.5);

        // The shared 1px frame stays on the alert.
        const border = lastRestDeclaration(elementRules, 'border');
        expect(border, `${mode}/${contrast} ${severity} alert border`).toBe(`1px solid ${roles.frame}`);
      }
    },
  );

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s no dead combined alert classes are emitted',
    (mode, contrast) => {
      const { theme } = resolveRoles(mode, contrast);
      const { rules } = renderChipAlerts(theme);
      const dead = rules.filter((rule) => /MuiAlert-filled(Error|Warning|Success|Info)\b/.test(rule.selector));
      expect(dead.map((rule) => rule.selector), `${mode}/${contrast} dead alert selectors`).toEqual([]);
    },
  );
});

// ── Outlined (hollow) chips: border === effective text color ──────────
//
// The outlined chip's 1px boundary is pinned to the chip's EFFECTIVE TEXT
// color in every state, replacing MUI's defaults (alpha(main, 0.7) on color
// chips, a grey default border on default chips) which never matched the
// ink. States covered here:
// - rest: border === ink for the default chip (ink = palette.text.primary)
//   and for each semantic color (ink = palette[color].main).
// - clickable + hover: MUI's hover/focus washes repaint only the FILL, so
//   the border stays pinned; asserted by effective border across hover rules
//   and by no border-color declaration in any hover rule.
// - deletable: the delete icon's own color changes, the root ink/border do
//   not — border still equals ink.
// - disabled: MUI dims the whole root with `opacity: action.disabledOpacity`,
//   so the declared border and ink composite identically over the page and
//   the exact-match contract survives compositing; the declared values are
//   asserted equal.
//
// Limitation (same as the filled suite): no headless browser, so state rules
// are verified at the emitted-CSS level with @media tracking.

describe('outlined chips (effective CSS)', () => {
  interface OutlinedCapture { rules: CssRule[]; classOf: Record<string, string[]>; }

  function renderOutlined(theme: Theme): OutlinedCapture {
    const cache = createCache({ key: 'sfchipout' });
    const nodes = createElement(
      'div',
      null,
      // Default color chip + the six semantic colors, each in four states.
      ...(['default', ...CHIP_COLORS] as const).flatMap((color) =>
        (['rest', 'clickable', 'deletable', 'disabled'] as const).map((state) => {
          const props: Record<string, unknown> = {
            key: `${state}-${color}`,
            label: `x-outlined-${state}-${color}`,
            variant: 'outlined' as const,
          };
          if (color !== 'default') props.color = color;
          if (state === 'clickable') props.onClick = () => {};
          if (state === 'deletable') props.onDelete = () => {};
          if (state === 'disabled') { props.disabled = true; props.onDelete = () => {}; }
          return createElement(Chip, props);
        }),
      ),
    );
    const html = renderToString(
      <CacheProvider value={cache}>
        <ThemeProvider theme={theme}>{nodes}</ThemeProvider>
      </CacheProvider>,
    );
    const rules: CssRule[] = [];
    for (const m of html.matchAll(/<style data-emotion="[^"]*">([\s\S]*?)<\/style>/g)) {
      flattenCss(m[1], '', rules);
    }
    const classOf: Record<string, string[]> = {};
    for (const color of ['default', ...CHIP_COLORS] as const) {
      for (const state of ['rest', 'clickable', 'deletable', 'disabled'] as const) {
        classOf[`${state}-${color}`] = rootClasses(html, `x-outlined-${state}-${color}`, 'MuiChip-root');
      }
    }
    return { rules, classOf };
  }

  /** The chip's effective text ink: text.primary for the default chip,
   * palette[color].main for semantic colors (MUI's outlined ink rule). */
  function inkOf(theme: Theme, color: (typeof CHIP_COLORS)[number] | 'default'): string {
    if (color === 'default') return theme.palette.text.primary;
    return (theme.palette as never as Record<string, { main: string }>)[color].main;
  }

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s outlined chip border equals the effective text color in rest, clickable, deletable and disabled states',
    (mode, contrast) => {
      const { theme } = resolveRoles(mode, contrast);
      const { rules, classOf } = renderOutlined(theme);

      for (const color of ['default', ...CHIP_COLORS] as const) {
        const ink = inkOf(theme, color);
        const tag = `${mode}/${contrast} outlined ${color}`;

        for (const state of ['rest', 'clickable', 'deletable', 'disabled'] as const) {
          const classes = classOf[`${state}-${color}`];
          const elementRules = ownElementRules(rules, classes);
          // BORDER: `currentColor` — the border always renders as the chip's
          // ACTUAL computed text color, including consumer overrides. (SSR
          // emits the literal keyword; a browser resolves it — verified live.)
          const border = lastRestDeclaration(elementRules, 'border');
          expect(border, `${tag} ${state} border`).toBe('1px solid currentColor');
          // The ink itself: the last rest color declaration is the effective
          // text color (MUI's own outlined ink rule; unchanged by the theme).
          const inkRule = lastRestDeclaration(elementRules, 'color');
          expect(inkRule, `${tag} ${state} ink`).toBe(ink);
        }

        // Clickable hover: the hover rules may repaint the fill only — no
        // border-color declaration may appear in any hover rule, and the
        // declared ink stays `ink` (no hover ink change to track).
        const clickableRules = ownElementRules(rules, classOf[`clickable-${color}`]);
        for (const rule of clickableRules) {
          if (/:hover/.test(rule.selector)) {
            expect(rule.declarations['border'], `${tag} clickable hover border repaint`).toBeUndefined();
            expect(rule.declarations['border-color'], `${tag} clickable hover border-color repaint`).toBeUndefined();
          }
        }
      }
    },
  );
});
