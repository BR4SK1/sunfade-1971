import type {
  BaseColors,
  Contrast,
  Mode,
  PaletteOverrides,
  ResolvedPalette,
} from '../palette/types.js';
import { resolvePalette } from '../palette/resolver.js';
import {
  DEFAULT_DARK_BASE_COLORS,
  DEFAULT_LIGHT_BASE_COLORS,
} from '../palette/defaults.js';

// ── Actions ──────────────────────────────────

export type PaletteAction =
  | { type: 'SET_BASE'; accent: keyof BaseColors; value: string }
  | { type: 'SET_OVERRIDE'; key: string; value: string }
  | { type: 'CLEAR_OVERRIDE'; key: string }
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'SET_CONTRAST'; contrast: Contrast }
  | { type: 'LOAD_SNAPSHOT'; baseColors: BaseColors; overrides: PaletteOverrides; mode: Mode; contrast: Contrast }
  | { type: 'RESET_DEFAULTS' };

// ── State ────────────────────────────────────

export interface PaletteState {
  baseColors: BaseColors;
  overrides: PaletteOverrides;
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
  const baseColors = mode === 'dark' ? { ...DEFAULT_DARK_BASE_COLORS } : { ...DEFAULT_LIGHT_BASE_COLORS };
  const overrides: PaletteOverrides = {};
  const contrast: Contrast = 'medium';
  return {
    baseColors,
    overrides,
    mode,
    contrast,
    resolved: resolve(baseColors, overrides, mode, contrast),
  };
}

// ── Reducer ──────────────────────────────────

export function paletteReducer(state: PaletteState, action: PaletteAction): PaletteState {
  switch (action.type) {
    case 'SET_BASE': {
      const baseColors = { ...state.baseColors, [action.accent]: action.value };
      return { ...state, baseColors, resolved: resolve(baseColors, state.overrides, state.mode, state.contrast) };
    }

    case 'SET_OVERRIDE': {
      const overrides = { ...state.overrides, [action.key]: action.value };
      return { ...state, overrides, resolved: resolve(state.baseColors, overrides, state.mode, state.contrast) };
    }

    case 'CLEAR_OVERRIDE': {
      const { [action.key]: _, ...overrides } = state.overrides;
      return { ...state, overrides, resolved: resolve(state.baseColors, overrides, state.mode, state.contrast) };
    }

    case 'SET_MODE': {
      const baseColors = action.mode === 'dark' ? { ...DEFAULT_DARK_BASE_COLORS } : { ...DEFAULT_LIGHT_BASE_COLORS };
      return {
        ...state,
        mode: action.mode,
        baseColors,
        overrides: {},
        resolved: resolve(baseColors, {}, action.mode, state.contrast),
      };
    }

    case 'SET_CONTRAST': {
      return { ...state, contrast: action.contrast, resolved: resolve(state.baseColors, state.overrides, state.mode, action.contrast) };
    }

    case 'LOAD_SNAPSHOT': {
      return {
        baseColors: action.baseColors,
        overrides: action.overrides,
        mode: action.mode,
        contrast: action.contrast,
        resolved: resolve(action.baseColors, action.overrides, action.mode, action.contrast),
      };
    }

    case 'RESET_DEFAULTS': {
      return createInitialState(state.mode);
    }

    default:
      return state;
  }
}
