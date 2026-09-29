import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { usePalette } from '../../context/usePalette';
import type { Contrast } from '../../palette/types';

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
        Preview contrast
      </Typography>
      <ToggleButtonGroup
        value={contrast}
        exclusive
        aria-label="Preview contrast"
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
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.35 }}>
        Changes preview surfaces and text roles; palette swatches stay the same.
      </Typography>
    </Box>
  );
}
