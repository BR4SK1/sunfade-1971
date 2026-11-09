// Effective-styling regression tests for flat Sunfade Paper (Round 8).
//
// The behavior this guards: MUI's Paper root rule paints
// `box-shadow: var(--Paper-shadow)` — the element's inline custom property
// carrying `theme.shadows[elevation]` — on every elevation-variant Paper
// (default Cards' internal Paper, plain `<Paper>` tiles, the color picker's
// inner sheet). MUI v9 emits no separate elevation-variant rule, so the
// theme's root styleOverride `boxShadow: 'none'` lands after it in the same
// merged Emotion rule and wins. Plain serializable data, no mutation of the
// theme `shadows` array, no added borders/colors — surfaces keep separating
// through the existing surface tiers and 1px frames, and the explicit
// flat+frame treatments on Popover/Menu/Dialog papers are untouched.
//
// Captured through the Emotion engine MUI uses (CacheProvider +
// renderToString), like the other suites; real-browser computed-style
// verification for the six variants is performed separately (round-8
// shadow-metrics-post.json / paper-shadow-evidence.json).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import createCache from '@emotion/cache';
import { CacheProvider, ThemeProvider } from '@emotion/react';
import { Card, Paper } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import { parseProjectDefaults } from '../../palette/project-defaults';
import { resolvePalette } from '../../palette/resolver';
import type { Contrast, Mode } from '../../palette/types';
import { getContrastRoles } from '../contrastRoles';
import { buildMuiTheme } from '../buildMuiTheme';
import { createSunfadeThemeOptions } from '../sunfadeTheme';

const MODES: readonly Mode[] = ['dark', 'light'];
const CONTRASTS: readonly Contrast[] = ['soft', 'medium', 'hard'];

// ── Theme setup (same pattern as the other suites) ──

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
  return { theme: buildMuiTheme(resolved, mode, contrast), roles: getContrastRoles(resolved, mode, contrast) };
}

// ── Captured CSS machinery (raw bodies kept: duplicate-property order is
// the cascade contract being asserted) ──

interface CssRule {
  selector: string;
  declarations: Record<string, string>;
  /** Raw declaration body, duplicates intact and in emission order. */
  rawBody: string;
}

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
      const declarations: Record<string, string> = {};
      for (const decl of body.split(';')) {
        const idx = decl.indexOf(':');
        if (idx === -1) continue;
        declarations[decl.slice(0, idx).trim()] = decl.slice(idx + 1).trim();
      }
      if (header && body.trim()) out.push({ selector: header, declarations, rawBody: body });
    }
    i = j;
  }
}

function renderPapers(theme: Theme): CssRule[] {
  const cache = createCache({ key: 'sfpap' });
  const html = renderToString(
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <div>
          <Paper data-testid="plain" />
          <Paper variant="outlined" data-testid="outlined" />
          <Paper elevation={8} data-testid="elevated8" />
          <Card data-testid="card" />
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

/** Last occurrence of a property in the raw body, including duplicates. */
function lastRawValue(rule: CssRule, property: string): string | undefined {
  const values = [...rule.rawBody.matchAll(new RegExp(`${property.replace(/-([a-z])/g, (m) => m[1].toUpperCase())}\\s*:\\s*([^;]+)`, 'g'))];
  void values;
  const matches = [...rule.rawBody.matchAll(new RegExp(`${property}\\s*:\\s*([^;]+)`, 'g'))];
  return matches.length ? matches[matches.length - 1][1].trim() : undefined;
}

// ── Flat elevation Paper across all six variants ──

describe('elevation Paper is flat (all six variants)', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s plain and elevated Papers carry no effective boxShadow — our none lands after MUI’s var() in the merged rule',
    (mode, contrast) => {
      const { theme } = resolveRoles(mode, contrast);
      const rules = renderPapers(theme);

      // The elevation-paper rule: the Paper root hash that still carries
      // MUI's stock `box-shadow: var(--Paper-shadow)` (Cards' internal Paper
      // merges into its own rule and is checked separately below).
      const merged = rules.find(
        (r) =>
          r.selector.includes('MuiPaper-root') &&
          !r.selector.includes('MuiCard-root') &&
          r.rawBody.includes('box-shadow:var(--Paper-shadow)'),
      );
      expect(merged, `${mode}/${contrast}: the paper root rule carrying MUI’s box-shadow var() exists`).toBeTruthy();
      if (!merged) return;

      // Our flat declaration must be the LAST box-shadow in that rule.
      const lastShadow = lastRawValue(merged, 'box-shadow');
      expect(lastShadow, `${mode}/${contrast}: effective elevation shadow`).toBe('none');

      // Order: none comes after the var() (later declaration wins).
      const varIdx = merged.rawBody.indexOf('box-shadow:var(--Paper-shadow)');
      const noneIdx = merged.rawBody.lastIndexOf('box-shadow:none');
      expect(noneIdx, `${mode}/${contrast}: our box-shadow:none is emitted`).toBeGreaterThan(-1);
      expect(noneIdx, `${mode}/${contrast}: our none lands after MUI’s var() declaration`).toBeGreaterThan(varIdx);
    },
  );

  it.each(MODES)('%s outlined Paper keeps the 1px frame and paints no shadow', (mode) => {
    const { theme, roles } = resolveRoles(mode, 'medium');
    const rules = renderPapers(theme);
    const outlined = rules.filter(
      (r) => r.selector.includes('MuiPaper-root') && !r.selector.includes('MuiCard-root') && r.rawBody.includes('border-width:1px'),
    );
    expect(outlined.length, 'the outlined-paper rule is emitted').toBeGreaterThan(0);
    for (const rule of outlined) {
      expect(lastRawValue(rule, 'border-width')).toBe('1px');
      expect(rule.rawBody).toContain(`border:1px solid ${roles.frame}`);
      // The root flat override also lands on outlined papers — effective
      // shadow is none there too.
      expect(lastRawValue(rule, 'box-shadow'), 'outlined paper paints no shadow').toBe('none');
    }
  });

  it('default Card keeps its own flat override (no shadow)', () => {
    const { theme } = resolveRoles('dark', 'medium');
    const rules = renderPapers(theme);
    const card = rules.filter((r) => r.selector.includes('MuiCard-root') && r.rawBody.includes('box-shadow:none'));
    expect(card.length, 'the MuiCard flat rule is emitted').toBeGreaterThan(0);
    expect(lastRawValue(card[0], 'box-shadow')).toBe('none');
  });
});

// ── Plain serializable data (standalone theme export contract) ──

describe('MuiPaper options stay plain serializable data', () => {
  it('styleOverrides survive a JSON round-trip unchanged', () => {
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
    const paper = options.components?.MuiPaper as Record<string, unknown>;
    expect(JSON.parse(JSON.stringify(paper))).toEqual(paper);
    const json = JSON.stringify(paper);
    expect(json).toContain('"boxShadow":"none"');
  });
});
