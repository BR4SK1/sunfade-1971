import { Box, Tab, Tabs, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { ButtonShowcase } from './ButtonShowcase.js';
import { CardShowcase } from './CardShowcase.js';
import { InputShowcase } from './InputShowcase.js';
import { ChipShowcase } from './ChipShowcase.js';
import { AlertShowcase } from './AlertShowcase.js';
import { TableShowcase } from './TableShowcase.js';
import { TypographyShowcase } from './TypographyShowcase.js';
import { NavigationShowcase } from './NavigationShowcase.js';
import { TerminalPreview } from './TerminalPreview.js';

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
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        {SECTIONS.map((s) => (
          <Tab key={s.label} label={s.label} sx={{ textTransform: 'none', minWidth: 'auto' }} />
        ))}
      </Tabs>
      <Box>{SECTIONS[tab].component}</Box>
    </Box>
  );
}
