import { Box, Divider, Typography } from '@mui/material';
import { AppShell } from './components/layout/AppShell.js';
import { ColorEditorPanel } from './components/editor/ColorEditorPanel.js';
import { PaletteGrid } from './components/editor/PaletteGrid.js';
import { ComponentGallery } from './components/gallery/ComponentGallery.js';

export default function App() {
  return (
    <AppShell sidebar={<ColorEditorPanel />}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Palette Overview
      </Typography>
      <PaletteGrid />

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Component Gallery
      </Typography>
      <ComponentGallery />
    </AppShell>
  );
}
