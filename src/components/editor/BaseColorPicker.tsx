import { Box, Typography } from '@mui/material';

interface BaseColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function BaseColorPicker({ label, value, onChange }: BaseColorPickerProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Box
        component="input"
        type="color"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        sx={{
          width: 32,
          height: 32,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          cursor: 'pointer',
          p: 0,
          '&::-webkit-color-swatch-wrapper': { p: 0 },
          '&::-webkit-color-swatch': { border: 'none', borderRadius: 1 },
        }}
      />
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
