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
import { PROJECT_DEFAULTS } from '../palette/project-defaults';

// ── Actions ──────────────────────────────────

export type PaletteAction =
  | { type: 'SET_BASE'; accent: keyof BaseColors; value: string }
  | { type: 'SET_OVERRIDE'; key: string; value: string }
  | { type: 'CLEAR_OVERRIDE'; key: string }
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'SET_CONTRAST'; contrast: Contrast }
  | { type: 'LOAD_SNAPSHOT'; baseColors: BaseColors; overrides: PaletteOverrides; mode: Mode; contrast: Contrast }
  | { type: 'LOAD_SCHEME'; palettes: ModePalettes; mode: Mode; contrast: Contrast }
  | { type: 'HYDRATE_PROJECT_DEFAULTS'; revision: number; palettes: ModePalettes }
  | { type: 'SAVE_DEFAULTS_SUCCEEDED'; revision: number }
  | { type: 'RESET_DEFAULTS' };

// ── State ────────────────────────────────────

export interface PaletteState {
  baseColors: BaseColors;
  overrides: PaletteOverrides;
  modePalettes: ModePalettes;
  mode: Mode;
  contrast: Contrast;
  resolved: ResolvedPalette;
  /** Revision of the project defaults this state was last synced with. */
  savedRevision: number;
  /** Snapshot of the palettes as last loaded/saved as project defaults. */
  savedPalettes: ModePalettes;
}

function resolve(
  baseColors: BaseColors,
  overrides: PaletteOverrides,
  mode: Mode,
  contrast: Contrast,
): ResolvedPalette {
  return resolvePalette({ baseColors, overrides, mode, contrast });
}

function copyModePalettes(palettes: ModePalettes): ModePalettes {
  return {
    dark: { baseColors: { ...palettes.dark.baseColors }, overrides: { ...palettes.dark.overrides } },
    light: { baseColors: { ...palettes.light.baseColors }, overrides: { ...palettes.light.overrides } },
  };
}

export function createInitialState(mode: Mode = 'dark'): PaletteState {
  // The tracked project-defaults artifact is the canonical source for both
  // modes; it is what fresh reloads and Reset restore to.
  const modePalettes = copyModePalettes(PROJECT_DEFAULTS.palettes);
  const contrast: Contrast = 'medium';
  const defaultsMetadata = {
    savedRevision: PROJECT_DEFAULTS.revision,
    savedPalettes: copyModePalettes(PROJECT_DEFAULTS.palettes),
  };
  return stateForMode(modePalettes, mode, contrast, defaultsMetadata);
}

function stateForMode(
  modePalettes: ModePalettes,
  mode: Mode,
  contrast: Contrast,
  metadata: Pick<PaletteState, 'savedRevision' | 'savedPalettes'>,
): PaletteState {
  const { baseColors, overrides } = modePalettes[mode];
  return {
    ...metadata,
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
      return stateForMode(state.modePalettes, action.mode, state.contrast, {
        savedRevision: state.savedRevision,
        savedPalettes: state.savedPalettes,
      });
    }

    case 'SET_CONTRAST': {
      return { ...state, contrast: action.contrast, resolved: resolve(state.baseColors, state.overrides, state.mode, action.contrast) };
    }

    case 'LOAD_SNAPSHOT': {
      const modePalettes = updateModePalette(state.modePalettes, action.mode, {
        baseColors: action.baseColors,
        overrides: action.overrides,
      });
      return stateForMode(modePalettes, action.mode, action.contrast, {
        savedRevision: state.savedRevision,
        savedPalettes: state.savedPalettes,
      });
    }

    case 'LOAD_SCHEME': {
      return stateForMode(action.palettes, action.mode, action.contrast, {
        savedRevision: state.savedRevision,
        savedPalettes: state.savedPalettes,
      });
    }

    case 'HYDRATE_PROJECT_DEFAULTS': {
      // Fresh reloads and restarts must use the saved project defaults. If the
      // on-disk artifact is newer than the bundled copy, adopt it — but only
      // when the user has not already diverged from what this page loaded
      // (their edits would otherwise be silently discarded).
      const unchanged = JSON.stringify(state.modePalettes) === JSON.stringify(state.savedPalettes);
      if (action.revision <= state.savedRevision || !unchanged) {
        return state;
      }
      const modePalettes = copyModePalettes(action.palettes);
      return stateForMode(modePalettes, state.mode, state.contrast, {
        savedRevision: action.revision,
        savedPalettes: copyModePalettes(action.palettes),
      });
    }

    case 'SAVE_DEFAULTS_SUCCEEDED': {
      // The save service accepted the current palettes as the project
      // defaults; record the revision and snapshot so dirty-state tracking
      // and future saves stay correct. Current edits are preserved.
      return {
        ...state,
        savedRevision: action.revision,
        savedPalettes: copyModePalettes(state.modePalettes),
      };
    }

    case 'RESET_DEFAULTS': {
      // Reset restores the saved project defaults for the active mode,
      // including any saved overrides. It uses the state's snapshot of the
      // saved defaults (which may be newer than the bundled artifact after a
      // hydrate or an in-session save) rather than the bundled copy.
      const saved = state.mode === 'dark' ? state.savedPalettes.dark : state.savedPalettes.light;
      const restored = { baseColors: { ...saved.baseColors }, overrides: { ...saved.overrides } };
      const modePalettes = updateModePalette(state.modePalettes, state.mode, restored);
      return stateForMode(modePalettes, state.mode, state.contrast, {
        savedRevision: state.savedRevision,
        savedPalettes: state.savedPalettes,
      });
    }

    default:
      return state;
  }
}
