import { useId, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Typography,
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { usePalette } from '../../context/usePalette';
import { ModeToggle } from './ModeToggle';
import { ContrastSelector } from './ContrastSelector';
import { BaseColorPicker } from './BaseColorPicker';
import { AccentColorGroup } from './AccentColorGroup';
import { ExportPanel } from './ExportPanel';
import { ACCENT_NAMES } from '../../palette/types';

export function ColorEditorPanel() {
  const { baseColors, resolved, setBase, resetDefaults } = usePalette();
  const [resetOpen, setResetOpen] = useState(false);
  const resetTitleId = useId();

  return (
    <Box component="aside" aria-label="Palette editor" sx={{ p: 1.5, overflow: 'auto', height: { xs: 'auto', md: '100%' }, flex: 1, minHeight: 0 }}>
      <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Palette Controls
      </Typography>
      <ModeToggle />
      <ContrastSelector />

      <Box
        component="section"
        aria-label="Live palette preview"
        sx={{ mb: 2, overflow: 'hidden', border: 1, borderColor: 'divider', borderRadius: 1 }}
      >
        <Typography
          variant="caption"
          sx={{ display: 'block', px: 1, py: 0.5, fontWeight: 700, color: 'terminalHeader.text', backgroundColor: 'terminalHeader.background' }}
        >
          LIVE PREVIEW
        </Typography>
        <Box sx={{ p: 1, backgroundColor: resolved.bg0_hard, color: resolved.fg1, fontFamily: 'monospace' }}>
          <Typography component="div" variant="caption" sx={{ color: 'inherit', fontFamily: 'inherit' }}>
            READY · SUNFADE 1971
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
            {(['bright_red', 'bright_yellow', 'bright_green'] as const).map((key) => (
              <Box
                key={key}
                aria-hidden="true"
                sx={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: resolved[key] }}
              />
            ))}
            <Typography component="span" variant="caption" sx={{ ml: 'auto', color: 'inherit', fontFamily: 'inherit' }}>
              {resolved.bg0.toUpperCase()}
            </Typography>
          </Box>
        </Box>
      </Box>

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
        onClick={() => setResetOpen(true)}
        fullWidth
        color="inherit"
      >
        Reset to Defaults
      </Button>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} aria-labelledby={resetTitleId}>
        <DialogTitle id={resetTitleId}>Reset this mode?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This restores the current mode&apos;s default colors and clears its overrides.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button variant="outlined" onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              resetDefaults();
              setResetOpen(false);
            }}
          >
            Reset Palette
          </Button>
        </DialogActions>
      </Dialog>

      <Divider sx={{ my: 1.5 }} />
      <ExportPanel />
    </Box>
  );
}
