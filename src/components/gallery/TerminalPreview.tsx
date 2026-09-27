import { Box, Typography } from '@mui/material';
import { usePalette } from '../../context/usePalette';
import type { ResolvedPalette } from '../../palette/types';

const ANSI_LABELS = [
  'Black', 'Red', 'Green', 'Yellow', 'Blue', 'Purple', 'Aqua', 'White',
  'Bright Black', 'Bright Red', 'Bright Green', 'Bright Yellow',
  'Bright Blue', 'Bright Purple', 'Bright Aqua', 'Bright White',
];

const ANSI_KEYS: (keyof ResolvedPalette)[] = [
  'bg0', 'neutral_red', 'neutral_green', 'neutral_yellow',
  'neutral_blue', 'neutral_purple', 'neutral_aqua', 'fg4',
  'gray', 'bright_red', 'bright_green', 'bright_yellow',
  'bright_blue', 'bright_purple', 'bright_aqua', 'fg1',
];

const SAMPLE_LINES = [
  { text: '$ ls -la ~/projects', color: 10 },
  { text: 'drwxr-xr-x  4 user user  4096 Mar 29 sunfade-retro/', color: 4 },
  { text: '-rw-r--r--  1 user user  1234 Mar 29 palette.ts', color: 7 },
  { text: '$ git status', color: 10 },
  { text: 'On branch main', color: 7 },
  { text: 'Changes not staged for commit:', color: 3 },
  { text: '  modified:   src/theme.ts', color: 1 },
  { text: '  modified:   src/App.tsx', color: 1 },
  { text: 'Untracked files:', color: 3 },
  { text: '  src/components/', color: 1 },
  { text: '$ npm test', color: 10 },
  { text: '✓ 98 tests passed', color: 2 },
  { text: '$ █', color: 7 },
];

export function TerminalPreview() {
  const { resolved } = usePalette();
  const colors = ANSI_KEYS.map((k) => resolved[k]);

  return (
    <Box>
      {/* ANSI color grid */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>ANSI Colors (0–15)</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px', mb: 3 }}>
        {colors.map((hex, i) => (
          <Box
            key={i}
            sx={{
              backgroundColor: hex,
              color: i < 8 && i !== 3 && i !== 7 ? colors[15] : colors[0],
              height: 48,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 0.5,
              fontSize: 10,
              fontFamily: 'monospace',
            }}
          >
            <span>{i}</span>
            <span>{ANSI_LABELS[i]}</span>
          </Box>
        ))}
      </Box>

      {/* Terminal emulation */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Terminal Preview</Typography>
      <Box
        sx={{
          backgroundColor: resolved.bg0,
          borderRadius: 1,
          p: 2,
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
          fontSize: 13,
          lineHeight: 1.6,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'auto',
        }}
      >
        {SAMPLE_LINES.map((line, i) => (
          <Box key={i} sx={{ color: colors[line.color], whiteSpace: 'pre' }}>
            {line.text}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
