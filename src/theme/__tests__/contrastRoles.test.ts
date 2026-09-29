import { describe, expect, it } from 'vitest';
import { getContrastRatio } from '@mui/material/styles';
import { DARK_DEFAULTS, LIGHT_DEFAULTS } from '../../palette/defaults';
import { serializeMuiTheme } from '../../palette/serializers/mui-serializer';
import type { Contrast, Mode, ResolvedPalette } from '../../palette/types';
import { buildMuiTheme } from '../buildMuiTheme';
import { getContrastRoles } from '../contrastRoles';

const CONTRASTS: Contrast[] = ['soft', 'medium', 'hard'];
const MODES: { mode: Mode; palette: ResolvedPalette }[] = [
  { mode: 'dark', palette: DARK_DEFAULTS },
  { mode: 'light', palette: LIGHT_DEFAULTS },
];

describe('contrast presentation', () => {
  for (const { mode, palette } of MODES) {
    it(`changes the full theme in ${mode} mode without changing palette swatches`, () => {
      const original = { ...palette };
      const themes = CONTRASTS.map((contrast) => buildMuiTheme(palette, mode, contrast));
      const [soft, medium, hard] = themes;
      const mediumRoles = getContrastRoles(palette, mode, 'medium');

      expect(themes.map((theme) => theme.palette.background.default))
        .toEqual([palette.bg0_soft, palette.bg0, palette.bg0_hard]);
      expect(themes.map((theme) => theme.palette.text.primary))
        .toEqual([palette.fg2, palette.fg1, palette.fg0]);
      expect(soft.palette.background.paper).toBe(palette.bg1);
      expect(hard.palette.background.paper).toBe(palette.bg2);
      expect(hard.palette.divider).not.toBe(medium.palette.divider);
      expect(soft.palette.primary.main).not.toBe(medium.palette.primary.main);
      expect(hard.palette.primary.main).not.toBe(medium.palette.primary.main);
      expect(medium.palette.primary.main).toBe(mediumRoles.accents.blue.main);
      expect(palette).toEqual(original);

      for (const [index, theme] of themes.entries()) {
        const roles = getContrastRoles(palette, mode, CONTRASTS[index]);
        expect(theme.palette.background.paper).toBe(roles.paper);
        expect(theme.palette.divider).toBe(roles.divider);
        expect(theme.palette.primary.contrastText).toBe(roles.accents.blue.contrastText);
        expect(theme.components?.MuiButton?.styleOverrides).toMatchObject({
          root: { border: `1px solid ${roles.divider}` },
        });
        expect(theme.components?.MuiCard?.styleOverrides).toMatchObject({
          root: { border: `1px solid ${roles.divider}` },
        });
        expect(theme.components?.MuiTooltip?.styleOverrides).toMatchObject({
          tooltip: { border: `1px solid ${roles.divider}` },
        });
        expect(theme.components?.MuiPopover?.styleOverrides).toMatchObject({
          paper: { border: `3px double ${roles.divider}` },
        });
        expect(theme.components?.MuiDialog?.styleOverrides).toMatchObject({
          paper: { border: `3px double ${roles.divider}` },
        });
        expect(getContrastRatio(theme.palette.text.primary, theme.palette.background.default)).toBeGreaterThan(4.5);
        expect(getContrastRatio(theme.palette.text.primary, theme.palette.background.paper)).toBeGreaterThan(4.5);

        for (const [name, accent] of Object.entries(roles.accents)) {
          expect(getContrastRatio(accent.contrastText, accent.main), `${mode} ${CONTRASTS[index]} ${name} label`).toBeGreaterThanOrEqual(4.5);
          expect(getContrastRatio(accent.main, roles.background), `${mode} ${CONTRASTS[index]} ${name} page`).toBeGreaterThanOrEqual(4.5);
          expect(getContrastRatio(accent.main, roles.paper), `${mode} ${CONTRASTS[index]} ${name} paper`).toBeGreaterThanOrEqual(4.5);
        }
      }

      expect(soft.palette.terminalHeader.background).toBe(palette.fg0);
      expect(soft.palette.terminalHeader.text).toBe(palette.bg0_hard);
      expect(getContrastRatio(soft.palette.terminalHeader.text, soft.palette.terminalHeader.background)).toBeGreaterThanOrEqual(4.5);
      expect(soft.shape.borderRadius).toBe(2);
      expect(soft.components?.MuiPopover?.styleOverrides).toMatchObject({
        paper: { border: `3px double ${getContrastRoles(palette, mode, 'soft').divider}` },
      });
    });

    it(`exports the same contrast roles shown in the ${mode} preview`, () => {
      for (const contrast of CONTRASTS) {
        const roles = getContrastRoles(palette, mode, contrast);
        const output = serializeMuiTheme(palette, mode, contrast);
        expect(output).toContain(`default: '${roles.background}'`);
        expect(output).toContain(`paper: '${roles.paper}'`);
        expect(output).toContain(`primary: '${roles.text}'`);
        expect(output).toContain(`secondary: '${roles.secondaryText}'`);
        expect(output).toContain(`divider: '${roles.divider}'`);
        expect(output).toContain(`main: '${roles.accents.blue.main}'`);
        expect(output).toContain(`contrastText: '${roles.accents.blue.contrastText}'`);
        expect(output).toContain(`'&:hover': { backgroundColor: '${roles.inputHover}' }`);
        expect(output).toContain(`background: '${roles.headerBackground}'`);
        expect(output).toContain(`border: '3px double ${roles.divider}'`);
        expect(output).toContain(`border: '1px solid ${roles.divider}'`);
        expect(output).toContain('shape: { borderRadius: 2 }');
      }
    });
  }

  it('derives contrast colors from edited bases and overrides', () => {
    const palette = {
      ...DARK_DEFAULTS,
      bg0: '#242f38',
      bg0_soft: '#303e47',
      bg0_hard: '#19252d',
      bg1: '#394953',
      fg0: '#f6f1e8',
      fg2: '#c9c3b7',
      neutral_blue: '#648fa2',
      bright_blue: '#91b8c4',
    };
    const roles = getContrastRoles(palette, 'dark', 'hard');
    const theme = buildMuiTheme(palette, 'dark', 'hard');

    expect(theme.palette.background.default).toBe(palette.bg0_hard);
    expect(theme.palette.text.primary).toBe(palette.fg0);
    expect(theme.palette.primary.main).toBe(roles.accents.blue.main);
    expect(theme.palette.primary.main).not.toBe(DARK_DEFAULTS.bright_blue);
    expect(serializeMuiTheme(palette, 'dark', 'hard')).toContain(`main: '${roles.accents.blue.main}'`);
  });
});
