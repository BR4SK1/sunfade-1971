import { createTheme, type Theme } from '@mui/material/styles';
import type { ResolvedPalette, Mode, Contrast } from '../palette/types';

// Module augmentation for MUI
declare module '@mui/material/styles' {
  interface PaletteColor {
    darker?: string;
  }
  interface SimplePaletteColorOptions {
    darker?: string;
  }
  interface Palette {
    orange: PaletteColor;
  }
  interface PaletteOptions {
    orange?: SimplePaletteColorOptions;
  }
}

export function buildMuiTheme(
  palette: ResolvedPalette,
  mode: Mode,
  contrast: Contrast,
): Theme {
  const bgDefault =
    contrast === 'hard' ? palette.bg0_hard :
    contrast === 'soft' ? palette.bg0_soft :
    palette.bg0;

  return createTheme({
    palette: {
      mode,
      background: {
        default: bgDefault,
        paper: palette.bg1,
      },
      text: {
        primary: palette.fg1,
        secondary: palette.fg2,
        disabled: palette.fg4,
      },
      primary: {
        light: palette.bright_blue,
        main: palette.neutral_blue,
        dark: palette.faded_blue,
        darker: palette.deep_blue,
        contrastText: palette.fg0,
      },
      secondary: {
        light: palette.bright_purple,
        main: palette.neutral_purple,
        dark: palette.faded_purple,
        darker: palette.deep_purple,
        contrastText: palette.fg0,
      },
      error: {
        light: palette.bright_red,
        main: palette.neutral_red,
        dark: palette.faded_red,
        darker: palette.deep_red,
        contrastText: palette.fg0,
      },
      warning: {
        light: palette.bright_yellow,
        main: palette.neutral_yellow,
        dark: palette.faded_yellow,
        darker: palette.deep_yellow,
        contrastText: palette.bg0,
      },
      success: {
        light: palette.bright_green,
        main: palette.neutral_green,
        dark: palette.faded_green,
        darker: palette.deep_green,
        contrastText: palette.bg0,
      },
      info: {
        light: palette.bright_aqua,
        main: palette.neutral_aqua,
        dark: palette.faded_aqua,
        darker: palette.deep_aqua,
        contrastText: palette.bg0,
      },
      orange: {
        light: palette.bright_orange,
        main: palette.neutral_orange,
        dark: palette.faded_orange,
        darker: palette.deep_orange,
        contrastText: palette.bg0,
      },
      divider: palette.bg2,
      action: {
        hover: `${palette.fg4}14`,     // ~8% opacity
        selected: `${palette.fg4}29`,   // ~16% opacity
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: bgDefault,
            color: palette.fg1,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderColor: palette.bg2,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: palette.bg0_hard,
            color: palette.fg1,
          },
        },
        defaultProps: {
          elevation: 0,
        },
      },
    },
  });
}
