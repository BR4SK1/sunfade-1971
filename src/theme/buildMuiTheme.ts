import { createTheme, type Theme } from '@mui/material/styles';
import type { Contrast, Mode, ResolvedPalette } from '../palette/types';
import { createSunfadeThemeOptions } from './sunfadeTheme';

/**
 * Build the live MUI theme for one Sunfade variant.
 *
 * A thin wrapper around the shared theme-options source — the standalone MUI
 * theme export consumes the same options, so preview and export always match.
 */
export function buildMuiTheme(
  palette: ResolvedPalette,
  mode: Mode,
  contrast: Contrast,
): Theme {
  return createTheme(createSunfadeThemeOptions(palette, mode, contrast));
}
