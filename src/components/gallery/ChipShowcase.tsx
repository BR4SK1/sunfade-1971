import { Box, Chip, Stack } from '@mui/material';

const COLORS = ['default', 'primary', 'secondary', 'error', 'warning', 'success', 'info'] as const;

export function ChipShowcase() {
  return (
    <Box>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
        {COLORS.map((color) => (
          <Chip key={color} label={color} color={color} size="small" />
        ))}
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
        {COLORS.map((color) => (
          <Chip key={color} label={color} color={color} variant="outlined" size="small" />
        ))}
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {COLORS.map((color) => (
          <Chip key={color} label={color} color={color} onDelete={() => {}} size="small" />
        ))}
      </Stack>
    </Box>
  );
}
