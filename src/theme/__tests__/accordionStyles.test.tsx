// Effective-styling regression tests for Sunfade MUI accordions.
//
// The behavior this guards: every accordion carries a consistent 1px outside
// frame in the themed border role (`roles.frame` — the fg2 swatch, which
// reads as cream in dark mode), the same tone every other framed surface uses
// (outlined Paper, Chip, Alert, Dialog, Popover, FilledInput), while keeping
// the quiet interior treatment: no shadow, MUI's own ::before separator
// hidden, and no interior divider on the expanded summary — the outer frame
// is the accordion's single boundary. Like buttonStyles.test.tsx, these tests
// render real components through the Emotion engine MUI uses
// (CacheProvider + renderToString), capture the CSS MUI emits, and assert the
// effective cascaded values — not just the theme options — so MUI defaults
// cannot silently win the cascade.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import createCache from '@emotion/cache';
import { CacheProvider, ThemeProvider } from '@emotion/react';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';

import { parseProjectDefaults } from '../../palette/project-defaults';
import { resolvePalette } from '../../palette/resolver';
import type { Contrast, Mode } from '../../palette/types';
import { buildMuiTheme } from '../buildMuiTheme';
import { getContrastRoles } from '../contrastRoles';

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

/** Flatten one Emotion style-tag body into ordered flat rules. Accordion
 * styling is unconditional, so @media blocks are not tracked here. */
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
    if (header.startsWith('@')) {
      // @media / @keyframes / @font-face — accordion styles are unconditional;
      // nested rules would need recursion, so they are skipped on purpose.
    } else if (!body.includes('{')) {
      const decls = parseDeclarations(body);
      if (header && Object.keys(decls).length) out.push({ selector: header, declarations: decls });
    }
    i = j;
  }
}

/** Rules that style the element itself: plain class selectors (no pseudo,
 * no descendant part) whose every class is on the element. */
function rulesForElement(rules: CssRule[], classList: string[]): CssRule[] {
  return rules.filter((rule) => {
    if (rule.selector.includes(':')) return false;
    const classes = rule.selector.match(/\.[A-Za-z][A-Za-z0-9_-]*/g) ?? [];
    return classes.length > 0 && classes.every((c) => classList.includes(c.slice(1)));
  });
}

/** Last declaration wins at equal specificity — MUI defaults emit first. */
function lastDeclaration(rules: CssRule[], property: string): string | undefined {
  let value: string | undefined;
  for (const rule of rules) {
    if (property in rule.declarations) value = rule.declarations[property];
  }
  return value;
}

// ── Theme setup ─────────────────────────────────────────────────────

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
}

function renderAccordions(theme: Theme): Capture {
  const cache = createCache({ key: 'sfacc' });
  // First accordion is defaultExpanded; second carries the exact props the
  // app uses (App.tsx, AccentColorGroup.tsx): disableGutters, elevation 0.
  const nodes = (
    <div>
      <Accordion defaultExpanded>
        <AccordionSummary>x-expanded-accordion</AccordionSummary>
        <AccordionDetails>details</AccordionDetails>
      </Accordion>
      <Accordion disableGutters elevation={0}>
        <AccordionSummary>x-collapsed-accordion</AccordionSummary>
        <AccordionDetails>details</AccordionDetails>
      </Accordion>
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

/** Class lists of the accordion roots, in order of appearance (render order:
 * expanded first, collapsed second). */
function accordionRootClassLists(html: string): string[][] {
  const lists = [...html.matchAll(/<div\b[^>]*\bclass="([^"]*MuiAccordion-root[^"]*)"/g)]
    .map((m) => m[1].split(/\s+/));
  expect(lists.length, 'two accordion roots rendered').toBe(2);
  return lists;
}

// ── The regression suite ────────────────────────────────────────────

describe('accordion frame (effective CSS)', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s accordion carries the themed 1px outside frame with no shadow and no ::before separator',
    (mode, contrast) => {
      const { theme, resolved, roles } = resolveRoles(mode, contrast);
      const { html, rules } = renderAccordions(theme);

      // The frame role IS the fg2 swatch — in dark mode that swatch is the
      // cream tone, so the accordion frame reads as cream in dark mode.
      expect(roles.frame, `${mode}/${contrast} frame role`).toBe(resolved.fg2);

      const classLists = accordionRootClassLists(html);
      // First root is defaultExpanded (carries Mui-expanded), second is the
      // collapsed app-style accordion (disableGutters, elevation 0).
      expect(classLists[0], 'expanded accordion root').toContain('Mui-expanded');
      expect(classLists[1], 'collapsed accordion root').not.toContain('Mui-expanded');

      for (const classList of classLists) {
        const elementRules = rulesForElement(rules, classList);

        // OUTSIDE FRAME: a standing 1px border in the shared frame role —
        // regardless of expanded state, gutters or elevation props.
        const border = lastDeclaration(elementRules, 'border');
        expect(border, `${mode}/${contrast} accordion border`).toBe(`1px solid ${roles.frame}`);

        // Quiet interior: no shadow underneath the frame.
        const boxShadow = lastDeclaration(elementRules, 'box-shadow');
        expect(boxShadow, `${mode}/${contrast} accordion box-shadow`).toBe('none');
      }

      // MUI's ::before separator stays hidden (the frame replaces it).
      const beforeRules = rules.filter(
        (rule) => rule.selector.includes('MuiAccordion-root') && /:?::?before$/.test(rule.selector),
      );
      expect(beforeRules.some((rule) => rule.declarations.display === 'none')).toBe(true);
    },
  );

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s expanded summary carries no interior border (the outer frame is the single boundary)',
    (mode, contrast) => {
      const { theme, roles } = resolveRoles(mode, contrast);
      const { html, rules } = renderAccordions(theme);

      // The prior divider fix: divider === frame, one prominent border tone
      // everywhere. That role equality is independent of the summary border.
      expect(roles.divider, `${mode}/${contrast} divider role`).toBe(roles.frame);

      const classMatch = /class="([^"]*MuiAccordionSummary-root[^"]*)"/.exec(html);
      expect(classMatch, 'accordion summary rendered').not.toBeNull();
      const classList = classMatch![1].split(/\s+/);
      const expandedRules = rules.filter(
        (rule) => rule.selector.includes('MuiAccordionSummary-root') && rule.selector.includes('Mui-expanded'),
      );
      expect(expandedRules.length, `${mode}/${contrast} expanded summary rules emitted`).toBeGreaterThan(0);

      // NO interior divider: the expanded summary emits no border-bottom (nor
      // any shorthand border) — the accordion root's 1px frame is the only
      // boundary line.
      const borderBottom = lastDeclaration(expandedRules, 'border-bottom');
      expect(borderBottom, `${mode}/${contrast} expanded summary border-bottom`).toBeUndefined();
      const border = lastDeclaration(expandedRules, 'border');
      expect(border, `${mode}/${contrast} expanded summary border`).toBeUndefined();
    },
  );

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s theme options pin the accordion frame to the shared border role',
    (mode, contrast) => {
      const { theme, roles } = resolveRoles(mode, contrast);
      const root = theme.components?.MuiAccordion?.styleOverrides?.root as
        | Record<string, unknown>
        | undefined;
      expect(root?.border).toBe(`1px solid ${roles.frame}`);
      expect(root?.boxShadow).toBe('none');
    },
  );
});
