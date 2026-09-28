import { describe, expect, it } from 'vitest';
import { createInitialState, paletteReducer } from '../palette-reducer';

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
