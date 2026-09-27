import type { ResolvedPalette } from '../palette/types';

/**
 * Inject/update CSS custom properties on <html> for instant visual feedback.
 * Converts palette keys like "bright_red" to "--sunfade-bright-red".
 */
export function injectCssVars(palette: ResolvedPalette): void {
  const style = document.documentElement.style;
  for (const [key, value] of Object.entries(palette)) {
    const varName = `--sunfade-${key.replace(/_/g, '-')}`;
    style.setProperty(varName, value as string);
  }
}
