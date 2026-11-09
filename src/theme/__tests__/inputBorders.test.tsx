// Effective-styling regression tests for Sunfade input boundary states (Round 6).
//
// The behavior this guards: enabled, non-error Standard (underline) and
// Outlined input boundaries rest on, and hover on, the shared 1px frame role
// (`roles.frame` — the fg2 swatch) rather than MUI's translucent standard
// line, MUI's 2px full-ink standard hover underline, or MUI's full-ink
// outlined hover notch. Filled inputs keep their existing surface-lift
// treatment (untouched here). The exclusions are load-bearing:
// - error inputs keep MUI's own error-colored boundary (our hover rules must
//   not govern them), and
// - focused inputs keep the exact 1px bright_orange focus swatch in every
//   state, including hover+focus.
// - touch devices (which see `:hover` as sticky-after-tap under MUI's
//   `(hover: none)` resets) must see the same 1px frame, so our unconditional
//   hover rules have to out-rank those media resets by source order.
//
// These tests assert the CSS MUI emits — including rule ORDER (later wins at
// equal specificity) and the :not() exclusion chains — so a MUI release
// cannot silently win the cascade back. Real-browser computed-style
// verification is performed separately (round evidence state matrices).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import createCache from '@emotion/cache';
import { CacheProvider, ThemeProvider } from '@emotion/react';
import { Input, OutlinedInput } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import { parseProjectDefaults } from '../../palette/project-defaults';
import { resolvePalette } from '../../palette/resolver';
import type { Contrast, Mode } from '../../palette/types';
import { getContrastRoles } from '../contrastRoles';
import { buildMuiTheme } from '../buildMuiTheme';

const MODES: readonly Mode[] = ['dark', 'light'];
const CONTRASTS: readonly Contrast[] = ['soft', 'medium', 'hard'];

// ── Captured CSS machinery (same pattern as inputTypography.test.tsx) ──

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

/** Flatten one Emotion style-tag body into ordered flat rules, including the
 * body of unconditional `:hover`/state combinators. `@media` blocks are
 * skipped here; the raw CSS is kept on the capture for media-order
 * assertions. */
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

/** Rules whose selector mentions every needle, in emission order. */
function matchingRules(rules: CssRule[], needles: string[]): CssRule[] {
  return rules.filter((r) => needles.every((n) => r.selector.includes(n)));
}

/** MUI defaults emit first; the last declaration of a property across
 * matching rules is the effective one at equal specificity. */
function lastDeclaration(rules: CssRule[], property: string): string | undefined {
  let value: string | undefined;
  for (const rule of rules) {
    if (property in rule.declarations) value = rule.declarations[property];
  }
  return value;
}

// ── Theme setup (same pattern as accordionStyles.test.tsx) ──

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
  return {
    theme: buildMuiTheme(resolved, mode, contrast),
    resolved,
    roles: getContrastRoles(resolved, mode, contrast),
  };
}

interface Capture {
  html: string;
  rules: CssRule[];
  /** Raw concatenated style bodies — media blocks intact. */
  css: string;
}

function renderInputs(theme: Theme): Capture {
  const cache = createCache({ key: 'sfbrd' });
  const nodes = (
    <div>
      <Input value="" readOnly placeholder="x-standard-input" />
      <OutlinedInput value="" readOnly placeholder="x-outlined-input" />
      <OutlinedInput error value="" readOnly placeholder="x-outlined-error" />
    </div>
  );
  const html = renderToString(
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>{nodes}</ThemeProvider>
    </CacheProvider>,
  );
  const rules: CssRule[] = [];
  const cssParts: string[] = [];
  for (const m of html.matchAll(/<style data-emotion="[^"]*">([\s\S]*?)<\/style>/g)) {
    cssParts.push(m[1]);
    flattenCss(m[1], rules);
  }
  return { html, rules, css: cssParts.join('\n') };
}

// ── Standard (underline) input boundary states ──

describe('standard (underline) input boundary states (all six variants)', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s rest underline is the 1px frame role, overriding MUI’s translucent line by order',
    (mode, contrast) => {
      const { roles, theme } = resolveRoles(mode, contrast);
      const { rules, css } = renderInputs(theme);

      // MUI's translucent rest line (shorthand `border-bottom`) is emitted.
      const muiRest = matchingRules(rules, ['MuiInput-root']).filter(
        (r) => /::?before$/.test(r.selector) && typeof r.declarations['border-bottom'] === 'string',
      );
      expect(muiRest.length, 'MUI emits a ::before rest rule with a border-bottom shorthand').toBeGreaterThan(0);

      // Our override sets border-bottom-color on ::before; it must be the
      // LAST such declaration (it wins) and equal to the frame role.
      const colorRules = matchingRules(rules, ['MuiInput-root']).filter(
        (r) => /::?before$/.test(r.selector) && 'border-bottom-color' in r.declarations,
      );
      expect(colorRules.length, 'a ::before border-bottom-color override is emitted').toBeGreaterThan(0);
      const last = colorRules[colorRules.length - 1];
      expect(last.declarations['border-bottom-color'], `${mode}/${contrast} rest underline color`).toBe(roles.frame);

      // Order: our color override appears after MUI's rest shorthand (the
      // selectors are identical — Emotion merges by hash — so order must be
      // read from the rule array, not string search).
      const oursIdx = rules.indexOf(last);
      const muiIdx = rules.indexOf(muiRest[0]);
      expect(oursIdx, 'our rest override is emitted after MUI’s rest rule').toBeGreaterThan(muiIdx);
    },
  );

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s hover keeps the 1px frame — out-ranks MUI’s 2px ink hover and its (hover: none) reset',
    (mode, contrast) => {
      const { roles, theme } = resolveRoles(mode, contrast);
      const { rules, css } = renderInputs(theme);

      // Our hover rule: 1px frame, excludes disabled and error.
      const ours = matchingRules(rules, [':hover:not(.Mui-disabled):not(.Mui-error)', 'MuiInput-root']).filter(
        (r) => /::?before$/.test(r.selector),
      );
      expect(ours.length, 'our standard hover rule is emitted').toBeGreaterThan(0);
      for (const rule of ours) {
        expect(
          rule.declarations['border-bottom'],
          `${mode}/${contrast} standard hover stays 1px frame`,
        ).toBe(`1px solid ${roles.frame}`);
      }

      // MUI's 2px full-ink hover rule exists; ours must come after it (equal
      // specificity — source order decides).
      const muiHover = matchingRules(rules, ['MuiInput-root']).filter(
        (r) => /:hover/.test(r.selector) && r.declarations['border-bottom']?.startsWith('2px'),
      );
      expect(muiHover.length, 'MUI’s 2px hover rule is still emitted (we out-rank it)').toBeGreaterThan(0);
      const oursIdx = css.indexOf(ours[0].selector);
      const muiIdx = css.indexOf(muiHover[0].selector);
      expect(oursIdx, 'our 1px hover rule is emitted after MUI’s 2px rule').toBeGreaterThan(muiIdx);

      // Touch: MUI's (hover: none) reset re-paints the translucent line for
      // sticky hover. Our unconditional hover rule must be emitted AFTER
      // that media block so it wins there too (same 1px frame as rest).
      const mediaIdx = css.indexOf('@media (hover: none)');
      expect(mediaIdx, 'MUI emits a (hover: none) block').toBeGreaterThan(-1);
      expect(oursIdx, 'our hover rule is emitted after the (hover: none) reset').toBeGreaterThan(mediaIdx);
    },
  );

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s focus line stays the exact 1px bright_orange swatch; error keeps MUI’s error color',
    (mode, contrast) => {
      const { resolved, roles, theme } = resolveRoles(mode, contrast);
      const { rules } = renderInputs(theme);

      // Focus line (::after): last border-bottom-color across MUI's
      // `2px solid primary` rule and our override must be bright_orange, and
      // the last width must be 1px.
      const afterRules = matchingRules(rules, ['MuiInput-root']).filter((r) => /::?after$/.test(r.selector));
      expect(afterRules.length, 'underline ::after rules are emitted').toBeGreaterThan(0);
      expect(lastDeclaration(afterRules, 'border-bottom-color'), `${mode}/${contrast} focus line color`).toBe(
        resolved.bright_orange,
      );
      expect(lastDeclaration(afterRules, 'border-bottom-width'), `${mode}/${contrast} focus line width`).toBe('1px');

      // Error: MUI's own grouped error rule survives (our rules exclude
      // error). It targets both ::before and ::after in one selector and
      // paints the theme's readability-adjusted red role (error.main), not
      // the raw neutral_red fill swatch. Rules carrying our :not() exclusions
      // are not error rules — they must not match here.
      const errorRules = matchingRules(rules, ['Mui-error'])
        .filter((r) => /::?(before|after)/.test(r.selector))
        .filter((r) => !r.selector.includes(':not('));
      expect(errorRules.length, 'MUI error boundary rule is emitted').toBeGreaterThan(0);
      for (const rule of errorRules) {
        expect(rule.declarations['border-bottom-color'], `${mode}/${contrast} error underline color`).toBe(
          roles.accents.red.main,
        );
      }
      // None of OUR hover/override rules target error inputs.
      for (const rule of matchingRules(rules, ['MuiInput-root', ':hover'])) {
        if (/::?before$/.test(rule.selector) && rule.declarations['border-bottom']) {
          expect(rule.selector, 'hover rules exclude error inputs').toContain('.Mui-error');
        }
      }
    },
  );
});

// ── Outlined input boundary states ──

describe('outlined input boundary states (all six variants)', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s rest notched border is the frame role; hover stays frame via the exclusion chain',
    (mode, contrast) => {
      const { roles, theme } = resolveRoles(mode, contrast);
      const { rules, css } = renderInputs(theme);

      // Rest: last border-color across the notchedOutline rules is frame.
      const notched = matchingRules(rules, ['MuiOutlinedInput-notchedOutline']);
      expect(notched.length, 'notchedOutline rules are emitted').toBeGreaterThan(0);
      expect(lastDeclaration(notched, 'border-color'), `${mode}/${contrast} notched rest color`).toBe(roles.frame);
      expect(lastDeclaration(notched, 'border-width'), `${mode}/${contrast} notched rest width`).toBe('1px');

      // Our hover rule exists, is frame-colored, and excludes focused+error.
      const ours = matchingRules(rules, [
        ':hover:not(.Mui-focused):not(.Mui-error)',
        'MuiOutlinedInput-notchedOutline',
      ]);
      expect(ours.length, 'our outlined hover rule is emitted').toBeGreaterThan(0);
      for (const rule of ours) {
        expect(rule.declarations['border-color'], `${mode}/${contrast} outlined hover stays frame`).toBe(roles.frame);
      }

      // MUI's full-ink hover rule exists; ours must come after it.
      const muiHover = matchingRules(rules, [':hover', 'MuiOutlinedInput-notchedOutline']).filter(
        (r) => !r.selector.includes(':not(.Mui-focused)'),
      );
      expect(muiHover.length, 'MUI’s ink hover rule is still emitted (we out-rank it)').toBeGreaterThan(0);
      const oursIdx = css.indexOf(ours[0].selector);
      const muiIdx = css.indexOf(muiHover[0].selector);
      expect(oursIdx, 'our hover rule is emitted after MUI’s hover rule').toBeGreaterThan(muiIdx);

      // Touch: our hover rule must also out-rank MUI's (hover: none) reset.
      const mediaIdx = css.indexOf('@media (hover: none)');
      expect(mediaIdx, 'MUI emits a (hover: none) block').toBeGreaterThan(-1);
      expect(oursIdx, 'our hover rule is emitted after the (hover: none) reset').toBeGreaterThan(mediaIdx);
    },
  );

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s focus stays the exact 1px bright_orange swatch; error keeps MUI’s error color',
    (mode, contrast) => {
      const { resolved, roles, theme } = resolveRoles(mode, contrast);
      const { rules } = renderInputs(theme);

      // Focused notched outline: last width/color must be 1px bright_orange
      // (MUI's 2px/primary defaults emit earlier).
      const focused = matchingRules(rules, ['Mui-focused', 'MuiOutlinedInput-notchedOutline']);
      expect(focused.length, 'focused notchedOutline rules are emitted').toBeGreaterThan(0);
      expect(lastDeclaration(focused, 'border-width'), `${mode}/${contrast} focus ring width`).toBe('1px');
      expect(lastDeclaration(focused, 'border-color'), `${mode}/${contrast} focus ring color`).toBe(
        resolved.bright_orange,
      );

      // Error notched outline: MUI's error color (the theme's readability-
      // adjusted red role), not frame/focus. Rules carrying :not()
      // exclusions are not error rules.
      const error = matchingRules(rules, ['Mui-error', 'MuiOutlinedInput-notchedOutline']).filter(
        (r) => !r.selector.includes(':not('),
      );
      expect(error.length, 'error notchedOutline rule is emitted').toBeGreaterThan(0);
      expect(lastDeclaration(error, 'border-color'), `${mode}/${contrast} error ring color`).toBe(
        roles.accents.red.main,
      );

      // Our own rules never repaint error inputs: our hover rule carries the
      // exclusion (asserted above). MUI's hover rule doesn't exclude error —
      // MUI's error rule wins over it by rule order — so assert that order:
      // the error rule must be emitted after MUI's hover rule.
      const muiNotchedHover = matchingRules(rules, [':hover', 'MuiOutlinedInput-notchedOutline']).filter(
        (r) => !r.selector.includes(':not(.Mui-focused)'),
      );
      const muiErrorRule = matchingRules(rules, ['Mui-error', 'MuiOutlinedInput-notchedOutline']).filter(
        (r) => !r.selector.includes(':not('),
      );
      expect(muiErrorRule.length, 'MUI error notched rule is emitted').toBeGreaterThan(0);
      expect(
        rules.indexOf(muiErrorRule[0]),
        'MUI’s error rule is emitted after its hover rule, so error inputs keep the error color while hovered',
      ).toBeGreaterThan(rules.indexOf(muiNotchedHover[0]));
    },
  );
});
