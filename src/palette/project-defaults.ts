// Canonical project defaults for Sunfade 1971.
//
// The tracked artifact `project-defaults.json` holds the light and dark
// palettes (base colors + overrides) that act as the project's defaults:
// it drives initial state, fresh reloads, and the Reset button. In local
// development, the save-companion server (src/scripts/save-defaults-server.mjs)
// writes this file; the JSON is bundled at build time, so the exported
// static site ships whatever defaults were saved when it was built.
//
// Reference colors in defaults.ts (REFERENCE_*) are derivation targets and
// are intentionally NOT overwritten by this artifact.

import rawProjectDefaults from './project-defaults.json';
import {
  DARK_DEFAULTS,
  DEFAULT_DARK_BASE_COLORS,
  DEFAULT_LIGHT_BASE_COLORS,
} from './defaults';
import {
  ACCENT_NAMES,
  type BaseColors,
  type Mode,
  type ModePalette,
  type ModePalettes,
} from './types';

const MODES: readonly Mode[] = ['dark', 'light'];
const BASE_COLOR_KEYS = [...ACCENT_NAMES, 'fg', 'bg'] as const satisfies readonly (keyof BaseColors)[];
const HEX_COLOR = /^#[\da-f]{6}$/i;

export interface ProjectDefaults {
  /** Monotonic revision, bumped by the save-companion on every save. */
  revision: number;
  palettes: ModePalettes;
}

/** Thrown when artifact content does not match the expected structure. */
export class InvalidProjectDefaultsError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isResolvedColorKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(DARK_DEFAULTS, key);
}

function parseModePalette(value: unknown, mode: Mode): ModePalette {
  if (!isRecord(value) || !isRecord(value.baseColors) || !isRecord(value.overrides)) {
    throw new InvalidProjectDefaultsError(`The ${mode} palette is missing base colors or overrides.`);
  }

  const baseColors = {} as BaseColors;
  for (const key of BASE_COLOR_KEYS) {
    const color = value.baseColors[key];
    if (typeof color !== 'string' || !HEX_COLOR.test(color)) {
      throw new InvalidProjectDefaultsError(`The ${mode} palette has an invalid ${key} base color.`);
    }
    baseColors[key] = color;
  }

  const overrides: Record<string, string> = {};
  for (const [key, color] of Object.entries(value.overrides)) {
    if (!isResolvedColorKey(key)) {
      throw new InvalidProjectDefaultsError(`The ${mode} palette has an unknown color override: ${key}.`);
    }
    if (typeof color !== 'string' || !HEX_COLOR.test(color)) {
      throw new InvalidProjectDefaultsError(`The ${mode} palette has an invalid ${key} override color.`);
    }
    overrides[key] = color;
  }

  return { baseColors, overrides };
}

/** Validates artifact-shaped data; throws InvalidProjectDefaultsError on any deviation. */
export function parseProjectDefaults(value: unknown): ProjectDefaults {
  if (!isRecord(value) || typeof value.revision !== 'number' || !Number.isInteger(value.revision) || value.revision < 1) {
    throw new InvalidProjectDefaultsError('The project defaults artifact has an invalid revision.');
  }
  if (!isRecord(value.palettes)) {
    throw new InvalidProjectDefaultsError('The project defaults artifact is missing its palettes.');
  }

  const palettes = {} as ModePalettes;
  for (const mode of MODES) {
    palettes[mode] = parseModePalette(value.palettes[mode], mode);
  }

  return { revision: value.revision, palettes };
}

function fallbackDefaults(): ProjectDefaults {
  return {
    revision: 0,
    palettes: {
      dark: { baseColors: { ...DEFAULT_DARK_BASE_COLORS }, overrides: {} },
      light: { baseColors: { ...DEFAULT_LIGHT_BASE_COLORS }, overrides: {} },
    },
  };
}

/**
 * The project defaults loaded from the tracked artifact. If the artifact is
 * invalid (e.g. a botched manual edit), fall back to the hardcoded defaults
 * rather than crashing the editor.
 */
export const PROJECT_DEFAULTS: ProjectDefaults = (() => {
  try {
    return parseProjectDefaults(rawProjectDefaults);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('project-defaults.json is invalid; using hardcoded defaults.', error);
    }
    return fallbackDefaults();
  }
})();
