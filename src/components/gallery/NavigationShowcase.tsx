import { AppBar, Box, Breadcrumbs, Link, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { useState } from 'react';

export function NavigationShowcase() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      {/* Tabs */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Tabs</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Editor" />
        <Tab label="Gallery" />
        <Tab label="Settings" disabled />
      </Tabs>

      {/* Breadcrumbs */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Breadcrumbs</Typography>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link underline="hover" color="inherit" href="#">Home</Link>
        <Link underline="hover" color="inherit" href="#">Palettes</Link>
        <Typography color="text.primary">sunfade-retro</Typography>
      </Breadcrumbs>

      {/* App Bar sample */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>AppBar (inline)</Typography>
      <AppBar position="static" sx={{ borderRadius: 1 }}>
        <Toolbar variant="dense">
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            Sample AppBar
          </Typography>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
