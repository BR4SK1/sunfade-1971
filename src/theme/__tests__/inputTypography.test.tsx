// Effective-styling regression tests for Sunfade MUI input typography (Round 3).
//
// The behavior this guards: all three input variants — Standard (underline),
// Outlined and Filled — are ordinary UI controls and therefore carry the same
// Montserrat chrome stack. MUI's default `font: inherit` chain pulls the base
// body stack (Caskaydia) into the standard variant only; the theme now pins
// the MuiInput root to the UI stack. The base typography stays Caskaydia so
// body text, terminal and data readouts (which are not MuiInput components)
// keep their face. Like buttonStyles.test.tsx, these tests render real
// components through the Emotion engine MUI uses (CacheProvider +
// renderToString), capture the CSS MUI emits, and assert the effective
// cascaded values — not just the theme options.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import createCache from '@emotion/cache';
import { CacheProvider, ThemeProvider } from '@emotion/react';
import { FilledInput, Input, OutlinedInput, InputLabel } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import { parseProjectDefaults } from '../../palette/project-defaults';
import { resolvePalette } from '../../palette/resolver';
import type { Contrast, Mode } from '../../palette/types';
import { buildMuiTheme } from '../buildMuiTheme';

const MODES: readonly Mode[] = ['dark', 'light'];
const CONTRASTS: readonly Contrast[] = ['soft', 'medium', 'hard'];

// ── Captured CSS machinery (lean variant of buttonStyles.test.tsx) ──

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
 * skipped (no input-fontFamily rules live inside media queries). */
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

/** Declarations from rules whose selector's every class sits on the given
 * element and whose selector targets exactly that element (no descendant
 * combinator). Later rules win — MUI defaults emit first. */
function ownDeclarations(rules: CssRule[], classList: string[]): Record<string, string> {
  const effective: Record<string, string> = {};
  for (const rule of rules) {
    if (rule.selector.includes(' ') && !rule.selector.includes('>')) continue;
    const classes = rule.selector.match(/\.[A-Za-z][A-Za-z0-9_-]*/g) ?? [];
    if (classes.length === 0 || !classes.every((c) => classList.includes(c.slice(1)))) continue;
    Object.assign(effective, rule.declarations);
  }
  return effective;
}

// ── Theme setup (same pattern as buttonStyles.test.tsx) ──

function themeFor(mode: Mode, contrast: Contrast): Theme {
  const defaults = parseProjectDefaults(
    JSON.parse(readFileSync(path.resolve(__dirname, '../../palette/project-defaults.json'), 'utf8')),
  );
  const resolved = resolvePalette({
    baseColors: defaults.palettes[mode].baseColors,
    overrides: defaults.palettes[mode].overrides,
    mode,
    contrast,
  });
  return buildMuiTheme(resolved, mode, contrast);
}

interface Capture {
  html: string;
  rules: CssRule[];
}

function renderInputs(theme: Theme): Capture {
  const cache = createCache({ key: 'sfin' });
  const nodes = (
    <div>
      <Input value="" placeholder="x-standard-input" readOnly />
      <OutlinedInput value="" placeholder="x-outlined-input" readOnly />
      <FilledInput value="" placeholder="x-filled-input" readOnly />
      <InputLabel>x-input-label</InputLabel>
    </div>
  );
  const html = renderToString(
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>{nodes}</ThemeProvider>
    </CacheProvider>,
  );
  const rules: CssRule[] = [];
  for (const m of html.matchAll(/<style data-emotion="[^"]*">([\s\S]*?)<\/style>/g)) {
    flattenCss(m[1], rules);
  }
  return { html, rules };
}

function elementClassLists(html: string, testId: string): string[][] {
  const lists: string[][] = [];
  for (const m of html.matchAll(/<[a-z]+[^>]*class="([^"]*)"[^>]*>/g)) {
    if (m[0].includes(testId)) lists.push(m[1].split(/\s+/).filter(Boolean));
  }
  return lists;
}

/** Class lists of the wrapper <div> whose classes include `rootClass` (e.g.
 * 'MuiInput-root'), in render order. */
function divClassLists(html: string, rootClass: string): string[][] {
  const lists: string[][] = [];
  for (const m of html.matchAll(/<div[^>]*class="([^"]*)"[^>]*>/g)) {
    const classes = m[1].split(/\s+/).filter(Boolean);
    if (classes.includes(rootClass)) lists.push(classes);
  }
  return lists;
}

const isMontserratStack = (family: string | undefined): boolean =>
  typeof family === 'string' && family.includes('--font-sunfade-montserrat');
const isCaskaydiaStack = (family: string | undefined): boolean =>
  typeof family === 'string' && family.includes('--font-sunfade-caskaydia');

describe('input variants share the Montserrat chrome stack (all six variants)', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s standard, outlined and filled inputs render the Montserrat stack',
    (mode, contrast) => {
      const theme = themeFor(mode, contrast);
      const { html, rules } = renderInputs(theme);

      // The font-family is declared on each variant's ROOT slot; the inner
      // <input> inherits it via MUI's `font: inherit`.
      for (const [variant, rootClass] of [
        ['standard', 'MuiInput-root'],
        ['outlined', 'MuiOutlinedInput-root'],
        ['filled', 'MuiFilledInput-root'],
      ] as const) {
        const rootClasses = divClassLists(html, rootClass);
        expect(rootClasses.length, `${variant} root rendered`).toBeGreaterThan(0);
        const effective = ownDeclarations(rules, rootClasses[0] ?? []);
        expect(
          isMontserratStack(effective['font-family'] ?? effective['fontFamily'] ?? effective['font']),
          `${mode}/${contrast} ${variant} root font-family is the Montserrat UI stack (got: ${effective['font-family'] ?? effective['font'] ?? effective['font-inherit']})`,
        ).toBe(true);
      }

      // The inner <input> declares only `font: inherit` — no variant paints a
      // competing family onto the inner element.
      const [standardInputClasses] = elementClassLists(html, 'x-standard-input');
      const inner = ownDeclarations(rules, standardInputClasses ?? []);
      expect(inner['font-family'] ?? inner['fontFamily'] ?? inner['font'], `${mode}/${contrast} inner input inherits`).toBe('inherit');
    },
  );

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s base body typography and labels keep their intended faces',
    (mode, contrast) => {
      const theme = themeFor(mode, contrast);
      const { html, rules } = renderInputs(theme);

      // Base typography: body/terminal stack stays Caskaydia (data readouts
      // and body text are unaffected by the standard-input fix).
      expect(isCaskaydiaStack(theme.typography.fontFamily), `${mode}/${contrast} base body stack is Caskaydia`).toBe(true);
      expect(isMontserratStack(theme.typography.h1.fontFamily), `${mode}/${contrast} heading face is Montserrat`).toBe(true);

      // The input LABEL inherits its family from the form-control root
      // (standard chain) — it must not fall back to Caskaydia either.
      const [labelClasses] = elementClassLists(html, 'x-input-label');
      const labelEffective = ownDeclarations(rules, labelClasses ?? []);
      const labelFamily = labelEffective['font-family'] ?? labelEffective['fontFamily'] ?? labelEffective['font'];
      expect(
        labelFamily === undefined || isMontserratStack(labelFamily),
        `${mode}/${contrast} standard input label is not Caskaydia`,
      ).toBe(true);
    },
  );
});
