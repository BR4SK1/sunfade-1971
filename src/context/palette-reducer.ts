import type {
  BaseColors,
  Contrast,
  Mode,
  ModePalette,
  ModePalettes,
  PaletteOverrides,
  ResolvedPalette,
} from '../palette/types';
import { resolvePalette } from '../palette/resolver';
import {
  DEFAULT_DARK_BASE_COLORS,
  DEFAULT_LIGHT_BASE_COLORS,
} from '../palette/defaults';

// ── Actions ──────────────────────────────────

export type PaletteAction =
  | { type: 'SET_BASE'; accent: keyof BaseColors; value: string }
  | { type: 'SET_OVERRIDE'; key: string; value: string }
  | { type: 'CLEAR_OVERRIDE'; key: string }
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'SET_CONTRAST'; contrast: Contrast }
  | { type: 'LOAD_SNAPSHOT'; baseColors: BaseColors; overrides: PaletteOverrides; mode: Mode; contrast: Contrast }
  | { type: 'LOAD_SCHEME'; palettes: ModePalettes; mode: Mode; contrast: Contrast }
  | { type: 'RESET_DEFAULTS' };

// ── State ────────────────────────────────────

export interface PaletteState {
  baseColors: BaseColors;
  overrides: PaletteOverrides;
  modePalettes: ModePalettes;
  mode: Mode;
  contrast: Contrast;
  resolved: ResolvedPalette;
}

function resolve(
  baseColors: BaseColors,
  overrides: PaletteOverrides,
  mode: Mode,
  contrast: Contrast,
): ResolvedPalette {
  return resolvePalette({ baseColors, overrides, mode, contrast });
}

export function createInitialState(mode: Mode = 'dark'): PaletteState {
  const modePalettes: ModePalettes = {
    dark: { baseColors: { ...DEFAULT_DARK_BASE_COLORS }, overrides: {} },
    light: { baseColors: { ...DEFAULT_LIGHT_BASE_COLORS }, overrides: {} },
  };
  const contrast: Contrast = 'medium';
  return stateForMode(modePalettes, mode, contrast);
}

function stateForMode(modePalettes: ModePalettes, mode: Mode, contrast: Contrast): PaletteState {
  const { baseColors, overrides } = modePalettes[mode];
  return {
    baseColors,
    overrides,
    modePalettes,
    mode,
    contrast,
    resolved: resolve(baseColors, overrides, mode, contrast),
  };
}

function updateModePalette(
  modePalettes: ModePalettes,
  mode: Mode,
  palette: ModePalette,
): ModePalettes {
  return { ...modePalettes, [mode]: palette };
}

// ── Reducer ──────────────────────────────────

export function paletteReducer(state: PaletteState, action: PaletteAction): PaletteState {
  switch (action.type) {
    case 'SET_BASE': {
      const baseColors = { ...state.baseColors, [action.accent]: action.value };
      const activePalette = { baseColors, overrides: state.overrides };
      const modePalettes = updateModePalette(state.modePalettes, state.mode, activePalette);
      return { ...state, ...activePalette, modePalettes, resolved: resolve(baseColors, state.overrides, state.mode, state.contrast) };
    }

    case 'SET_OVERRIDE': {
      const overrides = { ...state.overrides, [action.key]: action.value };
      const activePalette = { baseColors: state.baseColors, overrides };
      const modePalettes = updateModePalette(state.modePalettes, state.mode, activePalette);
      return { ...state, ...activePalette, modePalettes, resolved: resolve(state.baseColors, overrides, state.mode, state.contrast) };
    }

    case 'CLEAR_OVERRIDE': {
      const { [action.key]: _, ...overrides } = state.overrides;
      const activePalette = { baseColors: state.baseColors, overrides };
      const modePalettes = updateModePalette(state.modePalettes, state.mode, activePalette);
      return { ...state, ...activePalette, modePalettes, resolved: resolve(state.baseColors, overrides, state.mode, state.contrast) };
    }

    case 'SET_MODE': {
      return stateForMode(state.modePalettes, action.mode, state.contrast);
    }

    case 'SET_CONTRAST': {
      return { ...state, contrast: action.contrast, resolved: resolve(state.baseColors, state.overrides, state.mode, action.contrast) };
    }

    case 'LOAD_SNAPSHOT': {
      const modePalettes = updateModePalette(state.modePalettes, action.mode, {
        baseColors: action.baseColors,
        overrides: action.overrides,
      });
      return stateForMode(modePalettes, action.mode, action.contrast);
    }

    case 'LOAD_SCHEME': {
      return stateForMode(action.palettes, action.mode, action.contrast);
    }

    case 'RESET_DEFAULTS': {
      const baseColors = state.mode === 'dark' ? { ...DEFAULT_DARK_BASE_COLORS } : { ...DEFAULT_LIGHT_BASE_COLORS };
      const modePalettes = updateModePalette(state.modePalettes, state.mode, { baseColors, overrides: {} });
      return stateForMode(modePalettes, state.mode, state.contrast);
    }

    default:
      return state;
  }
}
