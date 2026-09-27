import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { usePalette } from '../../context/usePalette.js';
import type { Contrast } from '../../palette/types.js';

const OPTIONS: { value: Contrast; label: string }[] = [
  { value: 'soft', label: 'Soft' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export function ContrastSelector() {
  const { contrast, setContrast } = usePalette();

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 600 }}>
        Contrast
      </Typography>
      <ToggleButtonGroup
        value={contrast}
        exclusive
        onChange={(_, v) => v && setContrast(v)}
        size="small"
        fullWidth
      >
        {OPTIONS.map(o => (
          <ToggleButton key={o.value} value={o.value}>
            {o.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
