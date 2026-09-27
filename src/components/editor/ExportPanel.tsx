import { useState } from 'react';
import { Box, Button, Menu, MenuItem, Snackbar, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { usePalette } from '../../context/usePalette.js';
import { serializeMuiTheme } from '../../palette/serializers/mui-serializer.js';
import { serializeGhosttyConfig } from '../../palette/serializers/ghostty-serializer.js';
import { serializeCssVars } from '../../palette/serializers/css-serializer.js';
import { serializeHtmlOneSheet } from '../../palette/serializers/html-serializer.js';
import { resolvePalette } from '../../palette/resolver.js';
import {
  DEFAULT_DARK_BASE_COLORS,
  DEFAULT_LIGHT_BASE_COLORS,
} from '../../palette/defaults.js';

function download(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportPanel() {
  const { resolved, mode, contrast, baseColors, overrides } = usePalette();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [toast, setToast] = useState('');

  const exports = [
    {
      label: 'MUI Theme (.ts)',
      action: () => {
        const content = serializeMuiTheme(resolved, mode, contrast);
        download('sunfade-retro-theme.ts', content, 'text/typescript');
      },
    },
    {
      label: 'Ghostty Config',
      action: () => {
        const content = serializeGhosttyConfig(resolved, { name: 'Sunfade Retro', version: 1 });
        download('sunfade-retro-ghostty.conf', content, 'text/plain');
      },
    },
    {
      label: 'CSS Variables',
      action: () => {
        const content = serializeCssVars(resolved);
        download('sunfade-retro-vars.css', content, 'text/css');
      },
    },
    {
      label: 'HTML One-Sheet',
      action: () => {
        const opposite = mode === 'dark' ? 'light' : 'dark';
        const oppositeBase = opposite === 'dark' ? DEFAULT_DARK_BASE_COLORS : DEFAULT_LIGHT_BASE_COLORS;
        const oppositePalette = resolvePalette({
          baseColors: oppositeBase,
          overrides: {},
          mode: opposite,
          contrast,
        });
        const [dark, light] = mode === 'dark'
          ? [resolved, oppositePalette]
          : [oppositePalette, resolved];
        const content = serializeHtmlOneSheet(dark, light, { name: 'Sunfade Retro', version: 1 });
        download('sunfade-retro-palette.html', content, 'text/html');
      },
    },
    {
      label: 'Copy CSS to clipboard',
      action: () => {
        const content = serializeCssVars(resolved);
        navigator.clipboard.writeText(content).then(() => setToast('CSS copied!'));
      },
    },
  ];

  return (
    <Box sx={{ mb: 2 }}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<DownloadIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        fullWidth
      >
        Export
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {exports.map((exp) => (
          <MenuItem
            key={exp.label}
            onClick={() => {
              exp.action();
              setAnchor(null);
            }}
          >
            <Typography variant="body2">{exp.label}</Typography>
          </MenuItem>
        ))}
      </Menu>
      <Snackbar
        open={!!toast}
        autoHideDuration={2000}
        onClose={() => setToast('')}
        message={toast}
      />
    </Box>
  );
}
