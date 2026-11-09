// Effective-styling regression tests for Sunfade MUI ToggleButtons.
//
// The behavior this guards: a selected toggle is inverse video — the solid
// header band (`roles.headerBackground`) with its own label ink
// (`roles.headerText`) — and STAYS that fill while the pointer hovers it.
// MUI's own ToggleButton `standard` variant emits a higher-or-equal-order
// `&.Mui-selected:hover` rule that repaints the fill with translucent
// action.hover ink (a cream wash at selectedOpacity + hoverOpacity). Over a
// pale light-mode page that wash replaces the solid band and the cream label
// effectively disappears (the round-1 desktop-light evidence). The theme now
// pins selected+hover to the same solid inverse band; these tests capture the
// CSS MUI actually emits (Emotion renderToString) and assert the effective
// cascaded values, so a MUI release cannot silently win the cascade back.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import createCache from '@emotion/cache';
import { CacheProvider, ThemeProvider } from '@emotion/react';
import { ToggleButton } from '@mui/material';
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

/** Flatten one Emotion style-tag body into ordered flat rules, including the
 * body of unconditional `:hover` combinators. `@media (hover: none)` blocks
 * are tracked separately so touch-device rules can be asserted too. */
function flattenCss(css: string, out: CssRule[], mediaOut: CssRule[]): void {
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
      // Touch-device reset block: `@media (hover: none) { ... }` with plain
      // declarations for the same element class list.
      if (!body.includes('{')) {
        const decls = parseDeclarations(body);
        if (header && Object.keys(decls).length) mediaOut.push({ selector: header, declarations: decls });
      }
    } else if (!body.includes('{')) {
      const decls = parseDeclarations(body);
      if (header && Object.keys(decls).length) out.push({ selector: header, declarations: decls });
    }
    i = j;
  }
}

/** Rules whose selector's classes all sit on the element, that name the
 * `Mui-selected` state, and whose pseudo-class part equals `wantedPseudo`
 * (e.g. ':hover'; pass null for the resting selected rule). */
function selectedStateRules(rules: CssRule[], classList: string[], wantedPseudo: string | null): CssRule[] {
  return rules.filter((rule) => {
    if (!rule.selector.includes('Mui-selected')) return false;
    const classes = rule.selector.match(/\.[A-Za-z][A-Za-z0-9_-]*/g) ?? [];
    if (classes.length === 0 || !classes.every((c) => classList.includes(c.slice(1)))) return false;
    // Classes and :not(...) removed; what remains is the pseudo-class chain.
    const pseudos = rule.selector.replace(/\.[A-Za-z][A-Za-z0-9_-]*/g, '').replace(/:not\([^)]*\)/g, '').trim();
    return wantedPseudo === null ? pseudos === '' : pseudos === wantedPseudo;
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
  mediaRules: CssRule[];
}

function renderToggles(theme: Theme): Capture {
  const cache = createCache({ key: 'sftog' });
  const nodes = (
    <div>
      <ToggleButton selected value="selected-variant">x-selected-toggle</ToggleButton>
      <ToggleButton value="unselected-variant">x-unselected-toggle</ToggleButton>
    </div>
  );
  const html = renderToString(
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>{nodes}</ThemeProvider>
    </CacheProvider>,
  );
  const rules: CssRule[] = [];
  const mediaRules: CssRule[] = [];
  for (const m of html.matchAll(/<style data-emotion="[^"]*">([\s\S]*?)<\/style>/g)) {
    flattenCss(m[1], rules, mediaRules);
  }
  return { html, rules, mediaRules };
}

function toggleClassLists(html: string): string[][] {
  const lists: string[][] = [];
  for (const m of html.matchAll(/<button[^>]*class="([^"]*)"[^>]*>/g)) {
    lists.push(m[1].split(/\s+/).filter(Boolean));
  }
  return lists;
}

function normColor(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

describe('selected ToggleButton stays inverse video while hovered (all six variants)', () => {
  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s selected+hover keeps the solid header band and header label ink',
    (mode, contrast) => {
      const { theme, roles } = resolveRoles(mode, contrast);
      const { html, rules } = renderToggles(theme);

      const [classList] = toggleClassLists(html); // first button is the selected one
      const hoverRules = selectedStateRules(rules, classList, ':hover');
      // Sanity: MUI's own selected:hover alpha wash is present in the cascade
      // (this is the rule the theme must out-order, not delete).
      expect(hoverRules.length, 'a selected:hover rule must exist').toBeGreaterThan(0);
      expect(
        hoverRules.some((r) => /\brgba\(/.test(r.declarations['background-color'] ?? '')),
        "MUI's own selected:hover wash (rgba) must still be emitted — the theme wins by order, not deletion",
      ).toBe(true);

      const hoverBg = lastDeclaration(hoverRules, 'background-color');
      const hoverColor = lastDeclaration(hoverRules, 'color');
      expect(normColor(hoverBg), `${mode}/${contrast} selected:hover background`).toBe(roles.headerBackground.toLowerCase());
      expect(normColor(hoverColor), `${mode}/${contrast} selected:hover label ink`).toBe(roles.headerText.toLowerCase());
    },
  );

  it.each(MODES.flatMap((mode) => CONTRASTS.map((contrast) => [mode, contrast] as const)))(
    '%s/%s selected (rest) is the solid header band with header label ink',
    (mode, contrast) => {
      const { theme, roles } = resolveRoles(mode, contrast);
      const { html, rules } = renderToggles(theme);

      const [classList] = toggleClassLists(html);
      const selectedRules = selectedStateRules(rules, classList, null);
      expect(selectedRules.length, 'a selected-state rule must exist').toBeGreaterThan(0);
      const restBg = lastDeclaration(selectedRules, 'background-color');
      const restColor = lastDeclaration(selectedRules, 'color');
      expect(normColor(restBg), `${mode}/${contrast} selected background`).toBe(roles.headerBackground.toLowerCase());
      expect(normColor(restColor), `${mode}/${contrast} selected label ink`).toBe(roles.headerText.toLowerCase());
    },
  );
});
