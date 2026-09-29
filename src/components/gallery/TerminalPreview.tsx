import { Box, Typography } from '@mui/material';
import { getContrastRatio } from '@mui/material/styles';
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

const KEYWORDS = new Set([
  'as', 'const', 'export', 'for', 'function', 'if', 'in', 'keyof', 'of', 'return', 'typeof',
]);

const TYPES = new Set(['AccentName', 'PaletteConfig', 'Record', 'ResolvedPalette', 'string']);
const CONSTANTS = new Set(['ACCENT_NAMES']);

const TOKEN_PATTERN = /\/\/.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|===|!==|=>|\.\.\.|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[=+\-*\/<>!&|]+|\{|\}|\(|\)|\[|\]|\.|,|:|;|\?/g;

interface CodeLine {
  number: number | null;
  text: string;
}

interface SyntaxToken {
  text: string;
  color: keyof ResolvedPalette;
}

// These lines are taken from src/palette/resolver.ts; the omitted middle is
// represented explicitly so the displayed line numbers still match the file.
const CODE_LINES: CodeLine[] = [
  { number: 18, text: 'export function resolvePalette(config: PaletteConfig): ResolvedPalette {' },
  { number: 19, text: '  const { baseColors, overrides, mode } = config;' },
  { number: 20, text: '' },
  { number: 21, text: '  // 1. Background shades' },
  { number: 22, text: '  const bgShades = deriveBgShades(baseColors.bg, mode);' },
  { number: 23, text: '' },
  { number: 24, text: '  // 2. Foreground shades' },
  { number: 25, text: '  const fgShades = deriveFgShades(baseColors.fg, mode);' },
  { number: 26, text: '' },
  { number: 27, text: '  // 3. Accent variants' },
  { number: 28, text: '  const accents: Record<string, string> = {};' },
  { number: 29, text: '  for (const name of ACCENT_NAMES) {' },
  { number: 30, text: '    const neutralValue = baseColors[name as keyof typeof baseColors];' },
  { number: 31, text: '    const variants = deriveAccentVariants(neutralValue, name as AccentName, mode);' },
  { number: 32, text: '    accents[`bright_${name}`] = variants.bright;' },
  { number: 33, text: '    accents[`neutral_${name}`] = variants.neutral;' },
  { number: 34, text: '    accents[`faded_${name}`] = variants.faded;' },
  { number: 35, text: '    accents[`deep_${name}`] = variants.deep;' },
  { number: 36, text: '  }' },
  { number: 37, text: '' },
  { number: 38, text: '  // 4. Gray' },
  { number: 39, text: '  const gray = deriveGray(bgShades.bg4, fgShades.fg4);' },
  { number: 40, text: '' },
  { number: 41, text: '  // 5. Assemble computed palette' },
  { number: 42, text: '  const computed: ResolvedPalette = {' },
  { number: 43, text: '    // bg' },
  { number: 44, text: '    bg0_hard: bgShades.bg0_hard,' },
  { number: 45, text: '    bg0: baseColors.bg,' },
  { number: 46, text: '    bg0_soft: bgShades.bg0_soft,' },
  { number: 47, text: '    bg1: bgShades.bg1,' },
  { number: 48, text: '    bg2: bgShades.bg2,' },
  { number: 49, text: '    bg3: bgShades.bg3,' },
  { number: 50, text: '    bg4: bgShades.bg4,' },
  { number: 51, text: '' },
  { number: 52, text: '    // fg' },
  { number: 53, text: '    fg0: fgShades.fg0,' },
  { number: 54, text: '    fg1: baseColors.fg,' },
  { number: 55, text: '    fg2: fgShades.fg2,' },
  { number: 56, text: '    fg3: fgShades.fg3,' },
  { number: 57, text: '    fg4: fgShades.fg4,' },
  { number: null, text: '    // ... accent palette fields ...' },
  { number: 96, text: '  // 6. Merge overrides on top' },
  { number: 97, text: '  const result = { ...computed };' },
  { number: 98, text: '  for (const [key, value] of Object.entries(overrides)) {' },
  { number: 99, text: '    if (key in result) {' },
  { number: 100, text: '      (result as Record<string, string>)[key] = value;' },
  { number: 101, text: '    }' },
  { number: 102, text: '  }' },
  { number: 103, text: '' },
  { number: 104, text: '  return result;' },
  { number: 105, text: '}' },
];

function tokenize(source: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let cursor = 0;

  for (const match of source.matchAll(TOKEN_PATTERN)) {
    const text = match[0];
    const start = match.index ?? cursor;
    if (start > cursor) tokens.push({ text: source.slice(cursor, start), color: 'fg1' });

    if (text.startsWith('//')) {
      tokens.push({ text, color: 'gray' });
    } else if (text.startsWith('`')) {
      const templateParts = text.slice(1, -1).split(/(\$\{[^}]+\})/g);
      tokens.push({ text: '`', color: 'bright_green' });
      for (const part of templateParts) {
        if (part.startsWith('${') && part.endsWith('}')) {
          tokens.push({ text: '${', color: 'neutral_red' });
          tokens.push(...tokenize(part.slice(2, -1)));
          tokens.push({ text: '}', color: 'neutral_red' });
        } else if (part) {
          tokens.push({ text: part, color: 'bright_green' });
        }
      }
      tokens.push({ text: '`', color: 'bright_green' });
    } else if (text.startsWith('"') || text.startsWith("'")) {
      tokens.push({ text, color: 'bright_green' });
    } else if (/^[A-Za-z_$]/.test(text)) {
      const afterToken = source.slice(start + text.length);
      const color = KEYWORDS.has(text)
        ? 'bright_purple'
        : TYPES.has(text)
          ? 'bright_aqua'
          : CONSTANTS.has(text)
            ? 'bright_orange'
            : /^\s*\(/.test(afterToken)
              ? 'bright_blue'
              : 'fg1';
      tokens.push({ text, color });
    } else if (/^\d/.test(text)) {
      tokens.push({ text, color: 'bright_yellow' });
    } else if (/^(?:\.\.\.|=>|===|!==|[=+\-*\/<>!&|])/.test(text)) {
      tokens.push({ text, color: 'neutral_red' });
    } else {
      tokens.push({ text, color: 'fg2' });
    }

    cursor = start + text.length;
  }

  if (cursor < source.length) tokens.push({ text: source.slice(cursor), color: 'fg1' });
  return tokens;
}

export function TerminalPreview() {
  const { resolved, mode } = usePalette();
  const colors = ANSI_KEYS.map((key) => resolved[key]);
  const terminalTextColor = (key: keyof ResolvedPalette): keyof ResolvedPalette => {
    if (key === 'gray') return 'fg1';
    if (!/^(?:bright|neutral|faded|deep)_/.test(key)) {
      const candidates: (keyof ResolvedPalette)[] = [key, 'fg0', 'fg1', 'fg2'];
      return candidates.find((candidate) => getContrastRatio(resolved[candidate], resolved.bg0_hard) >= 4.5)
        ?? 'fg1';
    }
    const accent = key.slice(key.indexOf('_') + 1);
    const variants = ['bright', 'neutral', 'faded', 'deep'].map((tier) => `${tier}_${accent}` as keyof ResolvedPalette);
    const ordered = mode === 'dark' ? variants : [...variants].reverse();
    const candidates: (keyof ResolvedPalette)[] = [key, ...ordered, 'fg0', 'fg1', 'fg2'];
    return candidates.find((candidate) => getContrastRatio(resolved[candidate], resolved.bg0_hard) >= 4.5)
      ?? candidates.reduce((best, candidate) =>
        getContrastRatio(resolved[candidate], resolved.bg0_hard) > getContrastRatio(resolved[best], resolved.bg0_hard)
          ? candidate
          : best,
      );
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>ANSI Colors (0–15)</Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(4, minmax(0, 1fr))', sm: 'repeat(8, minmax(0, 1fr))' },
          gap: 1,
          mb: 3,
        }}
      >
        {colors.map((hex, index) => (
          <Box key={ANSI_LABELS[index]} sx={{ minWidth: 0 }}>
            <Box
                role="img"
                aria-label={`ANSI ${index}: ${ANSI_LABELS[index]}, ${hex}`}
              sx={{
                height: 28,
                backgroundColor: hex,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 0.5,
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5, mt: 0.25 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 9 }}>
                {index}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {ANSI_LABELS[index]}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>Terminal Preview</Typography>
      <Box
        sx={{
          backgroundColor: resolved.bg0_hard,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.5,
            py: 0.75,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {(['bright_red', 'bright_yellow', 'bright_green'] as const).map((color) => (
            <Box key={color} aria-hidden="true" sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: resolved[color] }} />
          ))}
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 1, fontFamily: 'monospace' }}>
            src/palette/resolver.ts — TypeScript
          </Typography>
        </Box>
        <Box
          role="region"
          aria-label="Syntax-highlighted TypeScript source"
          sx={{ maxHeight: 520, overflow: 'auto', p: 1.5 }}
        >
          <Box
            component="pre"
            sx={{
              m: 0,
              width: 'max-content',
              minWidth: '100%',
              fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
              fontSize: 12,
              lineHeight: 1.65,
            }}
          >
            <Box component="code">
              {CODE_LINES.map(({ number, text }, index) => (
                <Box key={`${number ?? 'gap'}-${index}`} sx={{ display: 'flex', minHeight: '1.65em', whiteSpace: 'pre' }}>
                  <Box
                    component="span"
                    aria-hidden="true"
                    sx={{
                      color: resolved.fg1,
                      width: '3.5em',
                      flexShrink: 0,
                      pr: 1.5,
                      textAlign: 'right',
                      userSelect: 'none',
                    }}
                  >
                    {number ?? '···'}
                  </Box>
                  <Box component="span">
                    {tokenize(text).map((token, tokenIndex) => (
                      <Box component="span" key={`${tokenIndex}-${token.text}`} sx={{ color: resolved[terminalTextColor(token.color)] }}>
                        {token.text}
                      </Box>
                    ))}
                    {text.length === 0 ? ' ' : null}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
