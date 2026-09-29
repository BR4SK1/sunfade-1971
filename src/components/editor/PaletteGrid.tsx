import { Box, Tooltip, Typography } from '@mui/material';
import { usePalette } from '../../context/usePalette';
import type { ResolvedPalette } from '../../palette/types';
import { getContrastRatio } from '@mui/material/styles';

const GROUPS: { label: string; keys: (keyof ResolvedPalette)[] }[] = [
  {
    label: 'Background',
    keys: ['bg0_hard', 'bg0', 'bg0_soft', 'bg1', 'bg2', 'bg3', 'bg4'],
  },
  {
    label: 'Foreground',
    keys: ['fg0', 'fg1', 'fg2', 'fg3', 'fg4', 'gray'],
  },
  {
    label: 'Red',
    keys: ['bright_red', 'neutral_red', 'faded_red', 'deep_red'],
  },
  {
    label: 'Green',
    keys: ['bright_green', 'neutral_green', 'faded_green', 'deep_green'],
  },
  {
    label: 'Yellow',
    keys: ['bright_yellow', 'neutral_yellow', 'faded_yellow', 'deep_yellow'],
  },
  {
    label: 'Blue',
    keys: ['bright_blue', 'neutral_blue', 'faded_blue', 'deep_blue'],
  },
  {
    label: 'Purple',
    keys: ['bright_purple', 'neutral_purple', 'faded_purple', 'deep_purple'],
  },
  {
    label: 'Aqua',
    keys: ['bright_aqua', 'neutral_aqua', 'faded_aqua', 'deep_aqua'],
  },
  {
    label: 'Orange',
    keys: ['bright_orange', 'neutral_orange', 'faded_orange', 'deep_orange'],
  },
];

export function PaletteGrid() {
  const { resolved, overrides } = usePalette();

  return (
    <Box>
      {GROUPS.map((group) => (
        <Box
          key={group.label}
          component="section"
          aria-labelledby={`palette-group-${group.label.toLowerCase()}`}
          sx={{ mb: 2 }}
        >
          <Typography
            id={`palette-group-${group.label.toLowerCase()}`}
            component="h3"
            variant="subtitle2"
            sx={{ fontWeight: 700, mb: 0.5 }}
          >
              {group.label}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 0.5 }}>
            {group.keys.map((key) => {
              const hex = resolved[key];
              const isOverridden = key in overrides;
              const swatchTextColor = getContrastRatio(hex, resolved.fg0) >= getContrastRatio(hex, resolved.bg0_hard)
                ? resolved.fg0
                : resolved.bg0_hard;
              return (
                <Tooltip key={key} title={`${key}: ${hex}${isOverridden ? ' (overridden)' : ''}`}>
                  <Box
                    role="img"
                    aria-label={`${key.replace(/_/g, ' ')} ${hex}${isOverridden ? ', overridden' : ''}`}
                    sx={{
                      minWidth: 0,
                      minHeight: 64,
                      backgroundColor: hex,
                      color: swatchTextColor,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.25,
                      fontSize: 10,
                      fontFamily: 'monospace',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      position: 'relative',
                      cursor: 'default',
                    }}
                  >
                    <span style={{ fontSize: 9, textAlign: 'center' }}>{key.replace(/_/g, ' ')}</span>
                    <span>{hex}</span>
                    {isOverridden && (
                      <Box
                        aria-hidden="true"
                        sx={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: 'warning.main',
                        }}
                      />
                    )}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
