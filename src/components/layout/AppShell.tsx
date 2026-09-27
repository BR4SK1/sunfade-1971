import { useState } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Header } from './Header';
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
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{ zIndex: theme.zIndex.drawer + 1 }}
      >
        <Toolbar variant="dense">
          <IconButton
            edge="start"
            color="inherit"
            aria-label="Open palette editor"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 1, display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Header />
        </Toolbar>
      </AppBar>

      {/* Desktop sidebar is present in server-rendered HTML at every viewport. */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            mt: '48px',
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
            top: '48px',
            height: 'calc(100% - 48px)',
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
          p: 3,
          mt: '48px',
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
