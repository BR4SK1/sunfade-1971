// ──────────────────────────────────────────────
// CSS Serializer — ResolvedPalette → CSS custom properties string
// ──────────────────────────────────────────────

import type { ResolvedPalette } from '../types';

/**
 * Convert a palette key like "bg0_hard" or "bright_red" to a CSS variable name
 * like "--sunfade-bg0-hard" or "--sunfade-bright-red".
 */
function toVarName(key: string): string {
  return `--sunfade-${key.replace(/_/g, '-')}`;
}

/**
 * Serialize a resolved palette into a CSS custom properties block.
 * Output: `:root { --sunfade-bg0: #28201b; ... }`
 */
export function serializeCssVars(palette: ResolvedPalette): string {
  const entries = Object.entries(palette) as [string, string][];
  const declarations = entries
    .map(([key, value]) => `  ${toVarName(key)}: ${value};`)
    .join('\n');

  return `:root {\n${declarations}\n}\n`;
}
