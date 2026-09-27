import { useState } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Header } from './Header.js';
import type { ReactNode } from 'react';

const DRAWER_WIDTH = 360;

interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, children }: AppShellProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{ zIndex: theme.zIndex.drawer + 1 }}
      >
        <Toolbar variant="dense">
          {!isDesktop && (
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Header />
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            mt: isDesktop ? '48px' : 0,
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
          ml: isDesktop ? `${DRAWER_WIDTH}px` : 0,
          overflow: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
