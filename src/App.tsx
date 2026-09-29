'use client';

import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AppShell } from './components/layout/AppShell';
import { ColorEditorPanel } from './components/editor/ColorEditorPanel';
import { PaletteGrid } from './components/editor/PaletteGrid';
import { ComponentGallery } from './components/gallery/ComponentGallery';
import { SunfadeWordmark } from './components/layout/SunfadeWordmark';

export default function App() {
  return (
    <AppShell sidebar={<ColorEditorPanel />}>
      <Box
        component="header"
        sx={{
          mb: 3,
          p: { xs: 1.5, sm: 2 },
          color: 'terminalHeader.text',
          backgroundColor: 'terminalHeader.background',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          overflowX: 'auto',
        }}
      >
        <Typography
          component="h1"
          sx={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            p: 0,
            m: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          Sunfade 1971
        </Typography>
        <SunfadeWordmark />
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'inherit', opacity: 0.8 }}>
          Full-color terminal palette editor
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, maxWidth: 720, color: 'inherit', opacity: 0.9 }}>
          Warm hues recall faded ’70s photographs and golden hour, while the theme draws inspiration from the 3270
          terminal, introduced in 1971.
        </Typography>
      </Box>
      <Accordion
        defaultExpanded
        disableGutters
        elevation={0}
        sx={{
          mb: 3,
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="component-gallery-content"
          id="component-gallery-header"
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Component Preview
          </Typography>
        </AccordionSummary>
        <AccordionDetails id="component-gallery-content" sx={{ pt: 1.5 }}>
          <ComponentGallery />
        </AccordionDetails>
      </Accordion>

      <Accordion
        disableGutters
        elevation={0}
        sx={{
          mb: 3,
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="palette-overview-content"
          id="palette-overview-header"
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Palette Overview
          </Typography>
        </AccordionSummary>
        <AccordionDetails id="palette-overview-content" sx={{ pt: 1.5 }}>
          <PaletteGrid />
        </AccordionDetails>
      </Accordion>
    </AppShell>
  );
}
