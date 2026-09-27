import { useContext, useMemo } from 'react';
import { PaletteStateContext, PaletteDispatchContext } from './PaletteContext';
import type { PaletteState, PaletteAction } from './palette-reducer';
import type { AccentName, BaseColors, Contrast, Mode } from '../palette/types';

export function usePaletteState(): PaletteState {
  const ctx = useContext(PaletteStateContext);
  if (!ctx) throw new Error('usePaletteState must be used within PaletteProvider');
  return ctx;
}

export function usePaletteDispatch(): React.Dispatch<PaletteAction> {
  const ctx = useContext(PaletteDispatchContext);
  if (!ctx) throw new Error('usePaletteDispatch must be used within PaletteProvider');
  return ctx;
}

/** Convenience hook that returns state + typed action helpers. */
export function usePalette() {
  const state = usePaletteState();
  const dispatch = usePaletteDispatch();

  const actions = useMemo(() => ({
    setBase: (accent: keyof BaseColors, value: string) =>
      dispatch({ type: 'SET_BASE', accent, value }),
    setOverride: (key: string, value: string) =>
      dispatch({ type: 'SET_OVERRIDE', key, value }),
    clearOverride: (key: string) =>
      dispatch({ type: 'CLEAR_OVERRIDE', key }),
    setMode: (mode: Mode) =>
      dispatch({ type: 'SET_MODE', mode }),
    setContrast: (contrast: Contrast) =>
      dispatch({ type: 'SET_CONTRAST', contrast }),
    loadSnapshot: (snap: { baseColors: BaseColors; overrides: Record<string, string>; mode: Mode; contrast: Contrast }) =>
      dispatch({ type: 'LOAD_SNAPSHOT', ...snap }),
    resetDefaults: () =>
      dispatch({ type: 'RESET_DEFAULTS' }),
  }), [dispatch]);

  return { ...state, ...actions };
}
