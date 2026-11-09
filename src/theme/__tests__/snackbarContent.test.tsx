// Effective-styling regression tests for Sunfade SnackbarContent (Round 9).
//
// The behavior this guards: MUI's stock SnackbarContent (a Paper subclass)
// fills itself with `emphasize(background.default, 0.98 dark / 0.8 light)` —
// a near-white block in dark mode and a near-black block in light mode — and
// carries no frame. After Round 8 flattened Paper, that left the toast both
// outside the palette and unseparated. The theme now draws the toast on the
// ordinary paper/text/frame trio. No typography override (MUI's body2
// stack stays); action and close controls keep their own themed ink.
//
// Assertions, for ALL six mode/contrast variants:
//   - the snackbar root paints roles.paper with roles.text ink and a 1px
//     roles.frame border (effective cascade — MUI's emphasize() default
//     emits first and our override wins),
//   - message and action ink measure at least 4.5:1 against the resulting
//     fill (measured against the EMITTED colors; browser-computed
//     verification lives in the round-9 harness evidence),
//   - no typography override leaks in (the root rule adds no font-family).
// Serialization: the MuiSnackbarContent options stay plain serializable
// data for the standalone export. Custom-palette coverage is a finite
// sampled probe (see alertStandard.test.tsx for the same caveat) — no
// universal guarantee and no WCAG compliance claim.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import createCache from '@emotion/cache';
import { CacheProvider, ThemeProvider } from '@emotion/react';
import { Button, IconButton, SnackbarContent } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { getContrastRatio } from '@mui/material/styles';
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

// ── Captured CSS machinery (same pattern as inputBorders.test.tsx) ──

interface CssRule {
  selector: string;
  declarations: Record<string, string>;
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

/** One snackbar with a short message, an action button, and a close
 * IconButton — the realistic composition the harness renders. */
function renderSnackbar(theme: Theme): { rules: CssRule[]; html: string } {
  const cache = createCache({ key: 'sfsn' });
  const html = renderToString(
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <SnackbarContent
          message="Saved as project defaults."
          action={
            <>
              <Button color="secondary" size="small">
                Undo
              </Button>
              <IconButton aria-label="close" size="small" color="inherit">
                ×
              </IconButton>
            </>
          }
        />
      </ThemeProvider>
    </CacheProvider>,
  );
  const rules: CssRule[] = [];
  for (const m of html.matchAll(/<style data-emotion="[^"]*">([\s\S]*?)<\/style>/g)) {
    flattenCss(m[1], rules);
  }
  return { rules, html };
}

function lastRawValue(rule: CssRule, property: string): string | undefined {
  const matches = [...rule.rawBody.matchAll(new RegExp(`${property}\\s*:\\s*([^;]+)`, 'g'))];
  return matches.length ? matches[matches.length - 1][1].trim() : undefined;
}

// ── Root treatment + legibility across all six variants ──

describe('snackbar root treatment (all six variants)', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s snackbar paints paper/text/frame over MUI’s stock emphasize fill',
    (mode, contrast) => {
      const { theme, roles } = resolveRoles(mode, contrast);
      const { rules, html } = renderSnackbar(theme);

      // The root rule: MUI's stock background (emphasize → some computed
      // value) must be present but out-ranked by ours (later in the same
      // merged rule or a later rule).
      const root = rules.find((r) => r.selector.includes('MuiSnackbarContent-root'));
      expect(root, 'a snackbar root rule is emitted').toBeTruthy();
      if (!root) return;

      expect(lastRawValue(root, 'background-color'), `${mode}/${contrast}: fill is the paper role`).toBe(roles.paper);
      expect(lastRawValue(root, 'color'), `${mode}/${contrast}: ink is the text role`).toBe(roles.text);
      expect(lastRawValue(root, 'border'), `${mode}/${contrast}: 1px frame border`).toBe(`1px solid ${roles.frame}`);

      // MUI's stock emphasize fill must still appear earlier in the body
      // (the cascade contract — a MUI release cannot silently win back):
      // at least two background-color declarations, and the FIRST one is
      // not ours.
      const bgMatches = [...root.rawBody.matchAll(/background-color:\s*([^;]+)/g)];
      expect(bgMatches.length, 'stock fill + override both present').toBeGreaterThanOrEqual(2);
      expect(bgMatches[0][1].trim(), 'the first fill is MUI’s stock value, not our paper role').not.toBe(roles.paper);

      // Typography: the root rule's effective font-family is MUI's body2
      // stack, unchanged by us (Emotion minifies whitespace, so compare
      // space-normalized).
      const normFont = (s: string) => s.replace(/\s+/g, '');
      expect(normFont(root.declarations['font-family']), 'root font stays MUI body2').toBe(
        normFont(theme.typography.body2.fontFamily ?? ''),
      );

      // Legibility of the composed controls against the paper fill.
      const textRatio = getContrastRatio(roles.text, roles.paper);
      expect(textRatio, `${mode}/${contrast}: message ink on paper ≥ 4.5`).toBeGreaterThanOrEqual(4.5);

      // The action button: the rendered element must actually BE the
      // secondary text action (the class list comes from the same render),
      // and its ink is routed by MUI through --variant-textColor. Assert on
      // the rules that BOTH define the variable and style a MuiButton root —
      // and fail explicitly if none exists, rather than silently passing.
      const buttonClassMatch = html.match(/<button[^>]*class="([^"]*MuiButton-root[^"]*)"/);
      expect(
        buttonClassMatch,
        'the rendered snackbar action is a MuiButton element',
      ).toBeTruthy();
      const buttonClasses = buttonClassMatch?.[1].split(/\s+/) ?? [];
      expect(
        buttonClasses.some((c) => c.includes('MuiButton-colorSecondary')),
        'the snackbar action is the secondary color variant',
      ).toBe(true);

      const btnVarRules = rules.filter(
        (r) => r.selector.includes('MuiButton-root') && '--variant-textColor' in r.declarations,
      );
      expect(
        btnVarRules.length,
        `${mode}/${contrast}: the action button's --variant-textColor rule is emitted`,
      ).toBeGreaterThan(0);
      const inks = new Set(btnVarRules.map((r) => r.declarations['--variant-textColor']));
      expect(
        inks.size,
        `${mode}/${contrast}: all matching action rules agree on one ink`,
      ).toBe(1);
      const btnInk = [...inks][0];
      expect(btnInk, `${mode}/${contrast}: action ink is a hex`).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(
        getContrastRatio(btnInk, roles.paper),
        `${mode}/${contrast}: action ink on paper ≥ 4.5`,
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});

// ── Finite sampled custom palettes (same caveat as alertStandard) ──

describe('snackbar treatment with custom palettes (sampled, not universal)', () => {
  it('the stress-set palettes keep ≥4.5 message ink on the paper fill', () => {
    const defaults = parseProjectDefaults(
      JSON.parse(readFileSync(path.resolve(__dirname, '../../palette/project-defaults.json'), 'utf8')),
    );
    // Three deliberately diverse samples (subsets of the alert stress set —
    // the paper/text roles are the same roles ordinary surfaces use, so the
    // sampled check mirrors the alert probe's scope, not a guarantee).
    const samples: Array<{ name: string; bg: string; fg: string }> = [
      { name: 'cool-slate-vivid', bg: '#f1f5f9', fg: '#0f172a' },
      { name: 'near-black-mono', bg: '#0a0a0a', fg: '#e5e7eb' },
      { name: 'sepia-earth', bg: '#efe4d0', fg: '#2e2318' },
    ];
    for (const sample of samples) {
      for (const mode of MODES) {
        const resolved = resolvePalette({
          baseColors: { ...defaults.palettes[mode].baseColors, ...sample },
          overrides: {},
          mode,
          contrast: 'medium',
        });
        const theme = buildMuiTheme(resolved, mode, 'medium');
        const roles = getContrastRoles(resolved, mode, 'medium');
        const { rules } = renderSnackbar(theme);
        const root = rules.find((r) => r.selector.includes('MuiSnackbarContent-root'));
        expect(root, `${sample.name}/${mode}: root rule emitted`).toBeTruthy();
        expect(lastRawValue(root!, 'background-color'), `${sample.name}/${mode}: fill`).toBe(roles.paper);
        const ratio = getContrastRatio(roles.text, roles.paper);
        expect(ratio, `${sample.name}/${mode}: message ink ≥ 4.5`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

// ── Plain serializable data (standalone theme export contract) ──

describe('MuiSnackbarContent options stay plain serializable data', () => {
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
    const snackbar = options.components?.MuiSnackbarContent as Record<string, unknown>;
    expect(JSON.parse(JSON.stringify(snackbar))).toEqual(snackbar);
    const json = JSON.stringify(snackbar);
    expect(json).not.toContain('var(');
    expect(json).not.toContain('rgba(');
    expect(json).not.toContain('fontFamily');
  });
});
