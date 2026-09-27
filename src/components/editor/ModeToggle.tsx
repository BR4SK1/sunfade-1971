import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { usePalette } from '../../context/usePalette.js';

export function ModeToggle() {
  const { mode, setMode } = usePalette();

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ mb: 0.5, display: 'block', fontWeight: 600 }}>
        Mode
      </Typography>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, v) => v && setMode(v)}
        size="small"
        fullWidth
      >
        <ToggleButton value="dark">
          <DarkModeIcon sx={{ mr: 0.5, fontSize: 16 }} /> Dark
        </ToggleButton>
        <ToggleButton value="light">
          <LightModeIcon sx={{ mr: 0.5, fontSize: 16 }} /> Light
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
