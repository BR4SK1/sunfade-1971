import { describe, it, expect } from 'vitest';
import { deriveBgShades, deriveFgShades, deriveGray } from '../shade-engine';
import { DARK_DEFAULTS, LIGHT_DEFAULTS, DEFAULT_DARK_BASE_COLORS, DEFAULT_LIGHT_BASE_COLORS } from '../defaults';

describe('deriveBgShades — dark mode identity', () => {
  it('derives canonical dark bg shades from default bg0', () => {
    const shades = deriveBgShades(DEFAULT_DARK_BASE_COLORS.bg, 'dark');

    expect(shades.bg0_hard).toBe(DARK_DEFAULTS.bg0_hard);
    expect(shades.bg0_soft).toBe(DARK_DEFAULTS.bg0_soft);
    expect(shades.bg1).toBe(DARK_DEFAULTS.bg1);
    expect(shades.bg2).toBe(DARK_DEFAULTS.bg2);
    expect(shades.bg3).toBe(DARK_DEFAULTS.bg3);
    expect(shades.bg4).toBe(DARK_DEFAULTS.bg4);
  });
});

describe('deriveBgShades — light mode identity', () => {
  it('derives canonical light bg shades from default bg0', () => {
    const shades = deriveBgShades(DEFAULT_LIGHT_BASE_COLORS.bg, 'light');

    expect(shades.bg0_hard).toBe(LIGHT_DEFAULTS.bg0_hard);
    expect(shades.bg0_soft).toBe(LIGHT_DEFAULTS.bg0_soft);
    expect(shades.bg1).toBe(LIGHT_DEFAULTS.bg1);
    expect(shades.bg2).toBe(LIGHT_DEFAULTS.bg2);
    expect(shades.bg3).toBe(LIGHT_DEFAULTS.bg3);
    expect(shades.bg4).toBe(LIGHT_DEFAULTS.bg4);
  });
});

describe('deriveFgShades — dark mode identity', () => {
  it('derives canonical dark fg shades from default fg1', () => {
    const shades = deriveFgShades(DEFAULT_DARK_BASE_COLORS.fg, 'dark');

    expect(shades.fg0).toBe(DARK_DEFAULTS.fg0);
    expect(shades.fg2).toBe(DARK_DEFAULTS.fg2);
    expect(shades.fg3).toBe(DARK_DEFAULTS.fg3);
    expect(shades.fg4).toBe(DARK_DEFAULTS.fg4);
  });
});

describe('deriveFgShades — light mode identity', () => {
  it('derives canonical light fg shades from default fg1', () => {
    const shades = deriveFgShades(DEFAULT_LIGHT_BASE_COLORS.fg, 'light');

    expect(shades.fg0).toBe(LIGHT_DEFAULTS.fg0);
    expect(shades.fg2).toBe(LIGHT_DEFAULTS.fg2);
    expect(shades.fg3).toBe(LIGHT_DEFAULTS.fg3);
    expect(shades.fg4).toBe(LIGHT_DEFAULTS.fg4);
  });
});

describe('deriveBgShades — custom base', () => {
  it('produces valid hex values for a custom dark bg', () => {
    const shades = deriveBgShades('#1a1a2e', 'dark');
    for (const val of Object.values(shades)) {
      expect(val).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('produces valid hex values for a custom light bg', () => {
    const shades = deriveBgShades('#fffff0', 'light');
    for (const val of Object.values(shades)) {
      expect(val).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('deriveGray', () => {
  it('derives canonical gray from default dark bg4 and fg4', () => {
    const gray = deriveGray(DARK_DEFAULTS.bg4, DARK_DEFAULTS.fg4);
    expect(gray).toBe(DARK_DEFAULTS.gray);
  });

  it('derives canonical gray from default light bg4 and fg4', () => {
    const gray = deriveGray(LIGHT_DEFAULTS.bg4, LIGHT_DEFAULTS.fg4);
    expect(gray).toBe(LIGHT_DEFAULTS.gray);
  });
});
