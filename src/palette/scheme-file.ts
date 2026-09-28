import { ACCENT_NAMES, type BaseColors, type Contrast, type Mode, type ModePalette, type ModePalettes } from './types';
import { DARK_DEFAULTS } from './defaults';

const FILE_FORMAT = 'sunfade-retro-palette';
const FILE_VERSION = 1;
const MODES: readonly Mode[] = ['dark', 'light'];
const BASE_COLOR_KEYS = [...ACCENT_NAMES, 'fg', 'bg'] as const satisfies readonly (keyof BaseColors)[];
const HEX_COLOR = /^#[\da-f]{6}$/i;

export interface PaletteFileData {
  mode: Mode;
  contrast: Contrast;
  palettes: ModePalettes;
}

interface PaletteFileDocument extends PaletteFileData {
  format: typeof FILE_FORMAT;
  version: typeof FILE_VERSION;
}

export function serializePaletteFile(data: PaletteFileData): string {
  const document: PaletteFileDocument = {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    mode: data.mode,
    contrast: data.contrast,
    palettes: data.palettes,
  };
  return JSON.stringify(document, null, 2);
}

export function parsePaletteFile(text: string): PaletteFileData {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!isRecord(value) || value.format !== FILE_FORMAT || value.version !== FILE_VERSION) {
    throw new Error('This is not a supported Sunfade palette file.');
  }
  if (!isMode(value.mode)) {
    throw new Error('The palette file has an invalid current mode.');
  }
  if (!isContrast(value.contrast)) {
    throw new Error('The palette file has an invalid contrast setting.');
  }
  if (!isRecord(value.palettes)) {
    throw new Error('The palette file is missing its light and dark palettes.');
  }

  const palettes = {} as ModePalettes;
  for (const mode of MODES) {
    palettes[mode] = parseModePalette(value.palettes[mode], mode);
  }

  return { mode: value.mode, contrast: value.contrast, palettes };
}

function parseModePalette(value: unknown, mode: Mode): ModePalette {
  if (!isRecord(value) || !isRecord(value.baseColors) || !isRecord(value.overrides)) {
    throw new Error(`The ${mode} palette is missing base colors or overrides.`);
  }

  const baseColors = {} as BaseColors;
  for (const key of BASE_COLOR_KEYS) {
    const color = value.baseColors[key];
    if (typeof color !== 'string' || !HEX_COLOR.test(color)) {
      throw new Error(`The ${mode} palette has an invalid ${key} base color.`);
    }
    baseColors[key] = color;
  }

  const overrides: Record<string, string> = {};
  for (const [key, color] of Object.entries(value.overrides)) {
    if (!isResolvedColorKey(key)) {
      throw new Error(`The ${mode} palette has an unknown color override: ${key}.`);
    }
    if (typeof color !== 'string' || !HEX_COLOR.test(color)) {
      throw new Error(`The ${mode} palette has an invalid ${key} override color.`);
    }
    overrides[key] = color;
  }

  return { baseColors, overrides };
}

function isResolvedColorKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(DARK_DEFAULTS, key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMode(value: unknown): value is Mode {
  return value === 'dark' || value === 'light';
}

function isContrast(value: unknown): value is Contrast {
  return value === 'soft' || value === 'medium' || value === 'hard';
}
