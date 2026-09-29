import { Box, Tab, Tabs, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { ButtonShowcase } from './ButtonShowcase';
import { CardShowcase } from './CardShowcase';
import { InputShowcase } from './InputShowcase';
import { ChipShowcase } from './ChipShowcase';
import { AlertShowcase } from './AlertShowcase';
import { TableShowcase } from './TableShowcase';
import { TypographyShowcase } from './TypographyShowcase';
import { NavigationShowcase } from './NavigationShowcase';
import { TerminalPreview } from './TerminalPreview';

const SECTIONS: { label: string; component: ReactNode }[] = [
  { label: 'Buttons', component: <ButtonShowcase /> },
  { label: 'Cards', component: <CardShowcase /> },
  { label: 'Inputs', component: <InputShowcase /> },
  { label: 'Chips', component: <ChipShowcase /> },
  { label: 'Alerts', component: <AlertShowcase /> },
  { label: 'Tables', component: <TableShowcase /> },
  { label: 'Typography', component: <TypographyShowcase /> },
  { label: 'Navigation', component: <NavigationShowcase /> },
  { label: 'Terminal', component: <TerminalPreview /> },
];

export function ComponentGallery() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        aria-label="Component preview sections"
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {SECTIONS.map((s, index) => (
          <Tab
            key={s.label}
            id={`gallery-tab-${index}`}
            aria-controls="gallery-panel"
            label={s.label}
            sx={{ textTransform: 'none', minWidth: 'auto' }}
          />
        ))}
      </Tabs>
      <Box
        id="gallery-panel"
        role="tabpanel"
        aria-labelledby={`gallery-tab-${tab}`}
        tabIndex={0}
      >
        {SECTIONS[tab].component}
      </Box>
    </Box>
  );
}
