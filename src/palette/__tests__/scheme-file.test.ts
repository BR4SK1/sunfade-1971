import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../context/palette-reducer';
import { parsePaletteFile, serializePaletteFile } from '../scheme-file';

describe('palette scheme files', () => {
  it('round-trips both light and dark palettes with their settings', () => {
    const state = createInitialState('light');
    const palettes = {
      dark: {
        ...state.modePalettes.dark,
        baseColors: { ...state.modePalettes.dark.baseColors, red: '#aa3344' },
        overrides: { bg1: '#221100' },
      },
      light: {
        ...state.modePalettes.light,
        baseColors: { ...state.modePalettes.light.baseColors, bg: '#ffeecc' },
      },
    };

    const parsed = parsePaletteFile(serializePaletteFile({
      mode: state.mode,
      contrast: 'hard',
      palettes,
    }));

    expect(parsed).toEqual({
      mode: 'light',
      contrast: 'hard',
      palettes,
    });
  });

  it('continues to load palette files from the previous project name', () => {
    const state = createInitialState();
    const currentFormat = serializePaletteFile({
      mode: state.mode,
      contrast: state.contrast,
      palettes: state.modePalettes,
    });
    const legacyFormat = currentFormat.replace('sunfade-1971-palette', 'sunfade-retro-palette');

    expect(parsePaletteFile(legacyFormat)).toEqual({
      mode: state.mode,
      contrast: state.contrast,
      palettes: state.modePalettes,
    });
  });

  it('rejects invalid colors and unsupported override keys', () => {
    const state = createInitialState();
    const valid = JSON.parse(serializePaletteFile({
      mode: state.mode,
      contrast: state.contrast,
      palettes: state.modePalettes,
    }));

    valid.palettes.dark.baseColors.red = 'not-a-color';
    expect(() => parsePaletteFile(JSON.stringify(valid))).toThrow('invalid red base color');

    valid.palettes.dark.baseColors.red = '#c05a45';
    valid.palettes.dark.overrides.not_a_color = '#ffffff';
    expect(() => parsePaletteFile(JSON.stringify(valid))).toThrow('unknown color override');
  });

  it('reports malformed JSON clearly', () => {
    expect(() => parsePaletteFile('{')).toThrow('not valid JSON');
  });
});
