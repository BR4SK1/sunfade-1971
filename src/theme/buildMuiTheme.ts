import { createTheme, type Theme } from '@mui/material/styles';
import type { ResolvedPalette, Mode, Contrast } from '../palette/types';
import { getContrastRoles } from './contrastRoles';

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
    terminalHeader?: { background: string; text: string };
  }
  interface Palette {
    terminalHeader: { background: string; text: string };
  }
}

export function buildMuiTheme(
  palette: ResolvedPalette,
  mode: Mode,
  contrast: Contrast,
): Theme {
  const roles = getContrastRoles(palette, mode, contrast);

  return createTheme({
    palette: {
      mode,
      background: {
        default: roles.background,
        paper: roles.paper,
      },
      text: {
        primary: roles.text,
        secondary: roles.secondaryText,
        disabled: roles.disabledText,
      },
      primary: {
        ...roles.accents.blue,
      },
      secondary: {
        ...roles.accents.purple,
      },
      error: {
        ...roles.accents.red,
      },
      warning: {
        ...roles.accents.yellow,
      },
      success: {
        ...roles.accents.green,
      },
      info: {
        ...roles.accents.aqua,
      },
      orange: {
        ...roles.accents.orange,
      },
      terminalHeader: {
        background: roles.headerBackground,
        text: roles.headerText,
      },
      divider: roles.divider,
      action: {
        hover: `${roles.text}14`,     // ~8% opacity
        selected: `${roles.text}29`,   // ~16% opacity
        disabled: roles.disabledText,
        disabledBackground: roles.input,
      },
    },
    shape: { borderRadius: 2 },
    typography: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: roles.background,
            color: roles.text,
            backgroundImage: 'none',
          },
          '::selection': {
            backgroundColor: roles.accents.blue.main,
            color: roles.accents.blue.contrastText,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderColor: roles.divider,
            borderRadius: 2,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${roles.divider}`,
            borderRadius: 2,
            boxShadow: 'none',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: roles.headerBackground,
            color: roles.headerText,
            border: `1px solid ${roles.divider}`,
          },
        },
        defaultProps: {
          elevation: 0,
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            color: roles.text,
            borderRadius: 2,
            minHeight: 40,
            '&.Mui-selected': {
              backgroundColor: roles.inputHover,
              color: roles.text,
            },
            '&:focus-visible': { outline: `2px solid ${roles.accents.blue.main}`, outlineOffset: 2 },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            border: `1px solid ${roles.divider}`,
            borderRadius: 2,
            boxShadow: 'none',
            minHeight: 40,
            fontWeight: 600,
            textTransform: 'none',
            '&:focus-visible': { outline: `2px solid ${roles.accents.blue.main}`, outlineOffset: 2 },
          },
          contained: { boxShadow: 'none' },
        },
      },
      MuiButtonBase: {
        styleOverrides: {
          root: {
            '&.Mui-focusVisible': { outline: `2px solid ${roles.accents.blue.main}`, outlineOffset: 2 },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            border: `1px solid ${roles.divider}`,
            borderRadius: 2,
            minWidth: 40,
            minHeight: 40,
            '&:focus-visible': { outline: `2px solid ${roles.accents.blue.main}`, outlineOffset: 2 },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            border: '1px solid transparent',
            borderRadius: 2,
            color: roles.secondaryText,
            '&.Mui-selected': {
              color: roles.headerText,
              backgroundColor: roles.headerBackground,
            },
            '&:focus-visible': { outline: `2px solid ${roles.accents.blue.main}`, outlineOffset: 1 },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 2,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 1,
              borderColor: roles.accents.blue.main,
            },
          },
          notchedOutline: { borderWidth: 1, borderColor: roles.divider },
        },
      },
      MuiInput: {
        styleOverrides: {
          underline: {
            '&:after': { borderBottomWidth: 1, borderBottomColor: roles.accents.blue.main },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: roles.secondaryText,
          },
        },
      },
      MuiFilledInput: {
        styleOverrides: {
          root: {
            backgroundColor: roles.input,
            border: `1px solid ${roles.divider}`,
            borderRadius: 2,
            '&:before, &:after': { display: 'none' },
            '&:hover': {
              backgroundColor: roles.inputHover,
            },
            '&.Mui-focused': {
              backgroundColor: roles.input,
            },
            '&.Mui-disabled': {
              backgroundColor: roles.input,
            },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            backgroundColor: roles.headerBackground,
            color: roles.headerText,
            borderRadius: 2,
            '&.Mui-expanded': { minHeight: 48, borderBottom: `1px solid ${roles.divider}` },
          },
          content: { '&.Mui-expanded': { margin: '12px 0' } },
          expandIconWrapper: {
            color: roles.headerText,
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            border: `1px solid ${roles.divider}`,
            borderRadius: 2,
            boxShadow: 'none',
            '&:before': { display: 'none' },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            border: `1px solid ${roles.divider}`,
            borderRadius: 2,
            '&.MuiChip-filledPrimary': { backgroundColor: roles.accents.blue.main, color: roles.accents.blue.contrastText },
            '&.MuiChip-filledSecondary': { backgroundColor: roles.accents.purple.main, color: roles.accents.purple.contrastText },
            '&.MuiChip-filledError': { backgroundColor: roles.accents.red.main, color: roles.accents.red.contrastText },
            '&.MuiChip-filledWarning': { backgroundColor: roles.accents.yellow.main, color: roles.accents.yellow.contrastText },
            '&.MuiChip-filledSuccess': { backgroundColor: roles.accents.green.main, color: roles.accents.green.contrastText },
            '&.MuiChip-filledInfo': { backgroundColor: roles.accents.aqua.main, color: roles.accents.aqua.contrastText },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            border: `1px solid ${roles.divider}`,
            borderRadius: 2,
            '&.MuiAlert-filledError': { backgroundColor: roles.accents.red.main, color: roles.accents.red.contrastText },
            '&.MuiAlert-filledWarning': { backgroundColor: roles.accents.yellow.main, color: roles.accents.yellow.contrastText },
            '&.MuiAlert-filledSuccess': { backgroundColor: roles.accents.green.main, color: roles.accents.green.contrastText },
            '&.MuiAlert-filledInfo': { backgroundColor: roles.accents.aqua.main, color: roles.accents.aqua.contrastText },
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            border: `3px double ${roles.divider}`,
            borderRadius: 2,
            boxShadow: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: roles.paper,
            borderColor: roles.divider,
            borderRadius: 2,
            boxShadow: 'none',
          },
          root: {
            '&.MuiDrawer-modal .MuiDrawer-paper': { border: `3px double ${roles.divider}` },
            '&.MuiDrawer-docked .MuiDrawer-paper': { border: `1px solid ${roles.divider}` },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            border: `3px double ${roles.divider}`,
            borderRadius: 2,
            boxShadow: 'none',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { border: `1px solid ${roles.divider}`, borderRadius: 2 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: roles.divider },
        },
      },
    },
  });
}
