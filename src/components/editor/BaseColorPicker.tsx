import { Box, Typography } from '@mui/material';
import { ColorPickerControl } from './ColorPickerControl';

interface BaseColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function BaseColorPicker({ label, value, onChange }: BaseColorPickerProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <ColorPickerControl color={value} label={label} size={32} onChange={onChange} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', opacity: 0.7 }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}
