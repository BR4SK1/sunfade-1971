import { Box, Tooltip, Typography } from '@mui/material';
import { usePalette } from '../../context/usePalette.js';
import type { DerivedColorKey, ResolvedPalette } from '../../palette/types.js';
import { relativeLuminance } from '../../palette/color-utils.js';

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
        <Box key={group.label} sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
            {group.label}
          </Typography>
          <Box sx={{ display: 'flex', gap: '2px' }}>
            {group.keys.map((key) => {
              const hex = resolved[key];
              const isLight = relativeLuminance(hex) > 0.179;
              const isOverridden = key in overrides;
              return (
                <Tooltip key={key} title={`${key}: ${hex}${isOverridden ? ' (overridden)' : ''}`}>
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 48,
                      backgroundColor: hex,
                      color: isLight ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      borderRadius: 0.5,
                      position: 'relative',
                      cursor: 'default',
                    }}
                  >
                    <span>{hex}</span>
                    {isOverridden && (
                      <Box
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
