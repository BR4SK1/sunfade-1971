import { Box, Typography } from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';

export function Header() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
      <PaletteIcon sx={{ fontSize: 20 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '0.02em' }}>
        Sunfade Retro
      </Typography>
    </Box>
  );
}
