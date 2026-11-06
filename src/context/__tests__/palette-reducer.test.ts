import { describe, expect, it } from 'vitest';
import { createInitialState, paletteReducer } from '../palette-reducer';
import { DEFAULT_DARK_BASE_COLORS, DEFAULT_LIGHT_BASE_COLORS } from '../../palette/defaults';
import { PROJECT_DEFAULTS } from '../../palette/project-defaults';
import type { ModePalettes } from '../../palette/types';

describe('palette mode editing', () => {
  it('keeps light and dark edits separate when switching modes', () => {
    let state = createInitialState('dark');

    state = paletteReducer(state, { type: 'SET_BASE', accent: 'red', value: '#aa3344' });
    state = paletteReducer(state, { type: 'SET_MODE', mode: 'light' });
    expect(state.baseColors.red).not.toBe('#aa3344');

    state = paletteReducer(state, { type: 'SET_BASE', accent: 'red', value: '#447788' });
    state = paletteReducer(state, { type: 'SET_MODE', mode: 'dark' });
    expect(state.baseColors.red).toBe('#aa3344');

    state = paletteReducer(state, { type: 'SET_MODE', mode: 'light' });
    expect(state.baseColors.red).toBe('#447788');
  });
});

describe('project defaults lifecycle', () => {
  it('initializes both modes from the tracked artifact', () => {
    const state = createInitialState('dark');
    expect(state.savedRevision).toBe(PROJECT_DEFAULTS.revision);
    expect(state.modePalettes.dark.baseColors).toEqual(PROJECT_DEFAULTS.palettes.dark.baseColors);
    expect(state.modePalettes.light.baseColors).toEqual(PROJECT_DEFAULTS.palettes.light.baseColors);
    expect(state.savedPalettes).toEqual(state.modePalettes);
  });

  it('SAVE_DEFAULTS_SUCCEEDED records the revision and snapshots the palettes', () => {
    // Start from a stable fixture instead of the mutable tracked artifact, so
    // the save lifecycle is tested regardless of what overrides the user has
    // saved to project-defaults.json.
    const fixture: ModePalettes = {
      dark: { baseColors: { ...DEFAULT_DARK_BASE_COLORS }, overrides: {} },
      light: { baseColors: { ...DEFAULT_LIGHT_BASE_COLORS }, overrides: {} },
    };
    let state = createInitialState('dark');
    state = paletteReducer(state, { type: 'HYDRATE_PROJECT_DEFAULTS', revision: state.savedRevision + 1, palettes: fixture });
    state = paletteReducer(state, { type: 'SET_BASE', accent: 'red', value: '#123456' });
    state = paletteReducer(state, { type: 'SET_OVERRIDE', key: 'bg1', value: '#101010' });

    state = paletteReducer(state, { type: 'SAVE_DEFAULTS_SUCCEEDED', revision: 9 });
    expect(state.savedRevision).toBe(9);
    expect(state.savedPalettes.dark.baseColors.red).toBe('#123456');
    expect(state.savedPalettes.dark.overrides).toEqual({ bg1: '#101010' });
    // Edits are preserved, not reset.
    expect(state.modePalettes.dark.baseColors.red).toBe('#123456');
    expect(state.baseColors.red).toBe('#123456');
  });

  it('RESET_DEFAULTS restores the saved defaults for the active mode, including overrides', () => {
    let state = createInitialState('dark');
    const savedDark = PROJECT_DEFAULTS.palettes.dark;

    state = paletteReducer(state, { type: 'SET_BASE', accent: 'red', value: '#ff00ff' });
    state = paletteReducer(state, { type: 'SET_OVERRIDE', key: 'bg2', value: '#223344' });
    state = paletteReducer(state, { type: 'RESET_DEFAULTS' });

    expect(state.baseColors).toEqual(savedDark.baseColors);
    expect(state.overrides).toEqual(savedDark.overrides);
    // The other mode is untouched.
    expect(state.modePalettes.light.baseColors).toEqual(PROJECT_DEFAULTS.palettes.light.baseColors);
  });

  it('RESET_DEFAULTS restores saved overrides that differ from the bundled artifact', () => {
    let state = createInitialState('dark');
    // Simulate: saved defaults were hydrated from a newer artifact revision.
    const newer = {
      dark: { ...PROJECT_DEFAULTS.palettes.dark, overrides: { bg0: '#0b0b0b' } },
      light: { ...PROJECT_DEFAULTS.palettes.light, overrides: {} },
    };
    state = paletteReducer(state, { type: 'HYDRATE_PROJECT_DEFAULTS', revision: PROJECT_DEFAULTS.revision + 1, palettes: newer });
    expect(state.modePalettes.dark.overrides).toEqual({ bg0: '#0b0b0b' });

    state = paletteReducer(state, { type: 'SET_OVERRIDE', key: 'bg1', value: '#654321' });
    state = paletteReducer(state, { type: 'RESET_DEFAULTS' });
    expect(state.overrides).toEqual({ bg0: '#0b0b0b' });
  });

  it('HYDRATE_PROJECT_DEFAULTS adopts a newer artifact when the page is unchanged', () => {
    const state = createInitialState('dark');
    const newer = {
      dark: { baseColors: { ...PROJECT_DEFAULTS.palettes.dark.baseColors, red: '#00ff00' }, overrides: {} },
      light: PROJECT_DEFAULTS.palettes.light,
    };
    const next = paletteReducer(state, { type: 'HYDRATE_PROJECT_DEFAULTS', revision: state.savedRevision + 1, palettes: newer });
    expect(next.savedRevision).toBe(state.savedRevision + 1);
    expect(next.modePalettes.dark.baseColors.red).toBe('#00ff00');
  });

  it('HYDRATE_PROJECT_DEFAULTS ignores a stale revision', () => {
    const state = createInitialState('dark');
    const older = {
      dark: { baseColors: { ...PROJECT_DEFAULTS.palettes.dark.baseColors, red: '#00ff00' }, overrides: {} },
      light: PROJECT_DEFAULTS.palettes.light,
    };
    const next = paletteReducer(state, { type: 'HYDRATE_PROJECT_DEFAULTS', revision: state.savedRevision - 1, palettes: older });
    expect(next).toBe(state);
  });

  it('HYDRATE_PROJECT_DEFAULTS keeps user edits instead of clobbering them', () => {
    let state = createInitialState('dark');
    state = paletteReducer(state, { type: 'SET_BASE', accent: 'red', value: '#ff00ff' });
    const newer = {
      dark: { baseColors: { ...PROJECT_DEFAULTS.palettes.dark.baseColors, red: '#00ff00' }, overrides: {} },
      light: PROJECT_DEFAULTS.palettes.light,
    };
    const next = paletteReducer(state, { type: 'HYDRATE_PROJECT_DEFAULTS', revision: state.savedRevision + 1, palettes: newer });
    expect(next).toBe(state);
    expect(state.baseColors.red).toBe('#ff00ff');
  });
});
