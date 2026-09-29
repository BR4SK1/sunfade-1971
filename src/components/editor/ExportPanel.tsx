import { useRef, useState } from 'react';
import { Alert, Box, Button, Menu, MenuItem, Snackbar, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { usePalette } from '../../context/usePalette';
import { serializeMuiTheme } from '../../palette/serializers/mui-serializer';
import { serializeGhosttyConfig } from '../../palette/serializers/ghostty-serializer';
import { serializeCssVars } from '../../palette/serializers/css-serializer';
import { serializeHtmlOneSheet } from '../../palette/serializers/html-serializer';
import { resolvePalette } from '../../palette/resolver';
import { parsePaletteFile, serializePaletteFile } from '../../palette/scheme-file';

function download(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportPanel() {
  const { resolved, mode, contrast, modePalettes, loadScheme } = usePalette();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const savePaletteFile = () => {
    const content = serializePaletteFile({ palettes: modePalettes, mode, contrast });
    download('sunfade-1971-scheme.json', content, 'application/json');
    setToast({ message: 'Palette scheme saved.', severity: 'success' });
  };

  const loadPaletteFile = async (file: File) => {
    try {
      const scheme = parsePaletteFile(await file.text());
      loadScheme(scheme);
      setToast({ message: 'Palette scheme loaded.', severity: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Unable to load this palette file.',
        severity: 'error',
      });
    }
  };

  const exports = [
    {
      label: 'MUI Theme (.ts)',
      action: () => {
        const content = serializeMuiTheme(resolved, mode, contrast);
        download('sunfade-1971-theme.ts', content, 'text/typescript');
      },
    },
    {
      label: 'Ghostty Config',
      action: () => {
        const content = serializeGhosttyConfig(resolved, { name: 'Sunfade 1971', version: 1 });
        download('sunfade-1971-ghostty.conf', content, 'text/plain');
      },
    },
    {
      label: 'CSS Variables',
      action: () => {
        const content = serializeCssVars(resolved);
        download('sunfade-1971-vars.css', content, 'text/css');
      },
    },
    {
      label: 'HTML One-Sheet',
      action: () => {
        const opposite = mode === 'dark' ? 'light' : 'dark';
        const oppositeConfig = modePalettes[opposite];
        const oppositeResolved = resolvePalette({
          baseColors: oppositeConfig.baseColors,
          overrides: oppositeConfig.overrides,
          mode: opposite,
          contrast,
        });
        const [dark, light] = mode === 'dark' ? [resolved, oppositeResolved] : [oppositeResolved, resolved];
        const content = serializeHtmlOneSheet(dark, light, { name: 'Sunfade 1971', version: 1 });
        download('sunfade-1971-palette.html', content, 'text/html');
      },
    },
    {
      label: 'Copy CSS to clipboard',
      action: () => {
        const content = serializeCssVars(resolved);
        navigator.clipboard.writeText(content).then(() => setToast({ message: 'CSS copied!', severity: 'success' }));
      },
    },
  ];

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.35 }}>
        Export files to keep a copy of your palette. Changes reset when this page is refreshed.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<SaveIcon />}
          onClick={savePaletteFile}
          fullWidth
        >
          Save Scheme
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<UploadFileIcon />}
          onClick={() => fileInput.current?.click()}
          fullWidth
        >
          Load Scheme
        </Button>
      </Box>
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
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void loadPaletteFile(file);
        }}
      />
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
