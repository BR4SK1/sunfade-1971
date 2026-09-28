'use client';

import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AppShell } from './components/layout/AppShell';
import { ColorEditorPanel } from './components/editor/ColorEditorPanel';
import { PaletteGrid } from './components/editor/PaletteGrid';
import { ComponentGallery } from './components/gallery/ComponentGallery';
import { SunfadeWordmark } from './components/layout/SunfadeWordmark';

export default function App() {
  return (
    <AppShell sidebar={<ColorEditorPanel />}>
      <SunfadeWordmark />
      <Accordion
        defaultExpanded
        disableGutters
        elevation={0}
        sx={{
          mb: 3,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          '&::before': { display: 'none' },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="palette-overview-content"
          id="palette-overview-header"
        >
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Palette Overview
          </Typography>
        </AccordionSummary>
        <AccordionDetails id="palette-overview-content" sx={{ pt: 0 }}>
          <PaletteGrid />
        </AccordionDetails>
      </Accordion>

      <Accordion
        defaultExpanded
        disableGutters
        elevation={0}
        sx={{
          mb: 3,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          '&::before': { display: 'none' },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="component-gallery-content"
          id="component-gallery-header"
        >
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Component Gallery
          </Typography>
        </AccordionSummary>
        <AccordionDetails id="component-gallery-content" sx={{ pt: 0 }}>
          <ComponentGallery />
        </AccordionDetails>
      </Accordion>
    </AppShell>
  );
}
