import { Box, Button, Divider, Typography } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { usePalette } from '../../context/usePalette.js';
import { ModeToggle } from './ModeToggle.js';
import { ContrastSelector } from './ContrastSelector.js';
import { BaseColorPicker } from './BaseColorPicker.js';
import { AccentColorGroup } from './AccentColorGroup.js';
import { ExportPanel } from './ExportPanel.js';
import { ACCENT_NAMES, type AccentName } from '../../palette/types.js';

export function ColorEditorPanel() {
  const { baseColors, setBase, resetDefaults } = usePalette();

  return (
    <Box sx={{ p: 1.5, overflow: 'auto', height: '100%' }}>
      <ModeToggle />
      <ContrastSelector />
      <ExportPanel />

      <Divider sx={{ my: 1.5 }} />

      {/* Base BG/FG */}
      <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
        Background & Foreground
      </Typography>
      <BaseColorPicker
        label="Background (bg0)"
        value={baseColors.bg}
        onChange={(v) => setBase('bg', v)}
      />
      <BaseColorPicker
        label="Foreground (fg1)"
        value={baseColors.fg}
        onChange={(v) => setBase('fg', v)}
      />

      <Divider sx={{ my: 1.5 }} />

      {/* Accent groups */}
      <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
        Accents
      </Typography>
      {ACCENT_NAMES.map((accent) => (
        <AccentColorGroup key={accent} accent={accent} />
      ))}

      <Divider sx={{ my: 1.5 }} />

      <Button
        variant="text"
        size="small"
        startIcon={<RestoreIcon />}
        onClick={resetDefaults}
        fullWidth
        color="inherit"
      >
        Reset to Defaults
      </Button>
    </Box>
  );
}
