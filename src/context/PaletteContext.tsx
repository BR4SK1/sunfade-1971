'use client';

import { createContext, useReducer, type ReactNode } from 'react';
import {
  paletteReducer,
  createInitialState,
  type PaletteState,
  type PaletteAction,
} from './palette-reducer';

export const PaletteStateContext = createContext<PaletteState | null>(null);
export const PaletteDispatchContext = createContext<React.Dispatch<PaletteAction> | null>(null);

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(paletteReducer, 'dark', createInitialState);

  return (
    <PaletteStateContext.Provider value={state}>
      <PaletteDispatchContext.Provider value={dispatch}>
        {children}
      </PaletteDispatchContext.Provider>
    </PaletteStateContext.Provider>
  );
}
