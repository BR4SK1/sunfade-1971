// ──────────────────────────────────────────────
// Ghostty Serializer — ResolvedPalette → Ghostty terminal config string
// ──────────────────────────────────────────────

import type { ResolvedPalette } from '../types';

export interface GhosttyMeta {
  name: string;
  version: number;
}

/**
 * Serialize a resolved palette into Ghostty terminal configuration format.
 * Maps ANSI colors 0–15 for a warm, retro terminal palette.
 */
export function serializeGhosttyConfig(
  palette: ResolvedPalette,
  meta: GhosttyMeta,
): string {
  return `# Sunfade 1971 theme
# Palette: ${meta.name} v${meta.version}

background = ${palette.bg0}
foreground = ${palette.fg1}
cursor-color = ${palette.fg0}
selection-background = ${palette.bg2}
selection-foreground = ${palette.fg1}

# ANSI normal colors (0-7)
palette = 0=${palette.bg0}
palette = 1=${palette.neutral_red}
palette = 2=${palette.neutral_green}
palette = 3=${palette.neutral_yellow}
palette = 4=${palette.neutral_blue}
palette = 5=${palette.neutral_purple}
palette = 6=${palette.neutral_aqua}
palette = 7=${palette.fg4}

# ANSI bright colors (8-15)
palette = 8=${palette.gray}
palette = 9=${palette.bright_red}
palette = 10=${palette.bright_green}
palette = 11=${palette.bright_yellow}
palette = 12=${palette.bright_blue}
palette = 13=${palette.bright_purple}
palette = 14=${palette.bright_aqua}
palette = 15=${palette.fg1}
`;
}
