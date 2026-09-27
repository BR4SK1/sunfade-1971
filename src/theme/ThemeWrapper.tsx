'use client';

import { useEffect, useRef, useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import type { ReactNode } from 'react';
import { usePaletteState } from '../context/usePalette';
import { buildMuiTheme } from './buildMuiTheme';
import { injectCssVars } from './cssVarInjector';

const DEBOUNCE_MS = 150;

export function ThemeWrapper({ children }: { children: ReactNode }) {
  const { resolved, mode, contrast } = usePaletteState();

  // Immediate: inject CSS custom properties for instant color feedback
  useEffect(() => {
    injectCssVars(resolved);
  }, [resolved]);

  // Debounced: rebuild MUI theme (heavier operation)
  const debouncedTheme = useDebouncedMemo(
    () => buildMuiTheme(resolved, mode, contrast),
    [resolved, mode, contrast],
    DEBOUNCE_MS,
  );

  return (
    <ThemeProvider theme={debouncedTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

/** useMemo that only updates after a debounce delay. */
function useDebouncedMemo<T>(factory: () => T, deps: unknown[], delay: number): T {
  const valueRef = useRef<T>(factory());
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceUpdate] = useForceUpdate();

  useEffect(() => {
    if (pendingRef.current) clearTimeout(pendingRef.current);
    pendingRef.current = setTimeout(() => {
      valueRef.current = factory();
      forceUpdate();
    }, delay);
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return valueRef.current;
}

function useForceUpdate(): [number, () => void] {
  const [tick, setTick] = useState(0);
  return [tick, () => setTick(t => t + 1)];
}
