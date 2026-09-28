import { useState } from 'react';
import { Box, Button, Drawer, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import type { ReactNode } from 'react';

const DRAWER_WIDTH = 360;

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
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {sidebar}
      </Drawer>

      {/* Mobile editor drawer */}
      <Drawer
        variant="temporary"
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
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {sidebar}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: 3,
          overflow: 'auto',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: { xl: 1000 } }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'flex-end', mb: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<MenuIcon />}
              aria-label="Open palette editor"
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
