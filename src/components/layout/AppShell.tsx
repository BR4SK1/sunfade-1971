import { useState } from 'react';
import { Box, Button, Drawer, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import type { ReactNode } from 'react';

const DRAWER_WIDTH = 344;

interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, children }: AppShellProps) {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop editor is present in server-rendered HTML at every viewport. */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRadius: 1,
            borderRight: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
          },
        }}
      >
        {sidebar}
      </Drawer>

      {/* Mobile editor drawer */}
      <Drawer
        variant="temporary"
        id="palette-editor-drawer"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            maxWidth: 'calc(100vw - 48px)',
            boxSizing: 'border-box',
            top: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            border: `3px double ${theme.palette.divider}`,
            borderRadius: 1,
            backgroundColor: theme.palette.background.paper,
            boxShadow: 'none',
            '& > aside': { flex: 1, minHeight: 0 },
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CloseIcon />}
            aria-label="Close palette editor"
            onClick={() => setMobileOpen(false)}
          >
            Close
          </Button>
        </Box>
        {sidebar}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 1.5, sm: 2.5, lg: 3 },
          overflow: 'auto',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: { xl: 1200 } }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'flex-end', mb: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<MenuIcon />}
              aria-label="Open palette editor"
              aria-controls="palette-editor-drawer"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              Edit Palette
            </Button>
          </Box>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
