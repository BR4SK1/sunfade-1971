import { useState } from 'react';
import { Box, ButtonBase, Paper, Popover, useTheme } from '@mui/material';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { usePalette } from '../../context/usePalette';

interface ColorPickerControlProps {
  color: string;
  label: string;
  size: number;
  onChange: (color: string) => void;
}

export function ColorPickerControl({ color, label, size, onChange }: ColorPickerControlProps) {
  const theme = useTheme();
  const { mode, resolved } = usePalette();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const pickerBackground = mode === 'dark' ? resolved.bg0_hard : resolved.bg4;

  return (
    <>
      <ButtonBase
        aria-label={`Choose ${label} color, currently ${color}`}
        aria-haspopup="dialog"
        aria-expanded={!!anchorEl}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          width: size,
          height: size,
          flexShrink: 0,
          backgroundColor: color,
          border: '1px solid',
          borderColor: theme.palette.divider,
          borderRadius: 0.75,
          cursor: 'pointer',
        }}
      />
      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Paper
          role="dialog"
          aria-label={`Choose ${label} color`}
          elevation={8}
          sx={{ p: 1.5, width: 256, backgroundColor: pickerBackground, backgroundImage: 'none' }}
        >
          <HexColorPicker
            color={color}
            onChange={onChange}
            aria-label={`${label} color picker`}
            style={{ width: '100%', height: 176 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
            <Box
              aria-hidden="true"
              sx={{
                width: 28,
                height: 28,
                flexShrink: 0,
                borderRadius: 0.75,
                border: '1px solid',
                borderColor: theme.palette.divider,
                backgroundColor: color,
              }}
            />
            <HexColorInput
              aria-label={`${label} hex value`}
              color={color}
              onChange={onChange}
              prefixed
              style={{
                boxSizing: 'border-box',
                width: '100%',
                height: 32,
                padding: '0 8px',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 4,
                backgroundColor: pickerBackground,
                color: theme.palette.text.primary,
                font: '13px monospace',
              }}
            />
          </Box>
        </Paper>
      </Popover>
    </>
  );
}
