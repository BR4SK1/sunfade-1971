'use client';

import { Box, Divider, Typography } from '@mui/material';
import { AppShell } from './components/layout/AppShell';
import { ColorEditorPanel } from './components/editor/ColorEditorPanel';
import { PaletteGrid } from './components/editor/PaletteGrid';
import { ComponentGallery } from './components/gallery/ComponentGallery';

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
