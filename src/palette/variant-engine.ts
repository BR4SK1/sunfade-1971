// ──────────────────────────────────────────────
// Variant Engine — Derive bright/faded/deep from a neutral accent color
// ──────────────────────────────────────────────

import { hexToHsl, hslToHex, computeDelta, applyDelta } from './color-utils.js';
import { REFERENCE_ACCENTS } from './defaults.js';
import type { AccentName, AccentVariants, Mode } from './types.js';

/**
 * Derive the bright, faded, and deep variants of an accent color
 * given the user's neutral hex value.
 *
 * Algorithm:
 *  1. Compute HSL deltas between each Sunfade neutral and its bright/faded variants.
 *  2. Apply those deltas to the user's neutral to get derived bright/faded.
 *  3. Extrapolate deep by applying the faded delta a second time (neutral + 2×faded_delta).
 *
 * The `mode` parameter is reserved for future per-mode adjustments; accent
 * variant relationships are currently shared between light and dark modes.
 */
export function deriveAccentVariants(
  neutral: string,
  accentName: AccentName,
  _mode: Mode,
): AccentVariants {
  const ref = REFERENCE_ACCENTS[accentName];
  const refNeutralHsl = hexToHsl(ref.neutral);
  const refBrightHsl = hexToHsl(ref.bright);
  const refFadedHsl = hexToHsl(ref.faded);

  // Step 1: compute reference deltas
  const brightDelta = computeDelta(refNeutralHsl, refBrightHsl);
  const fadedDelta = computeDelta(refNeutralHsl, refFadedHsl);

  // Step 2: apply deltas to user's neutral
  const userNeutralHsl = hexToHsl(neutral);
  const derivedBright = applyDelta(userNeutralHsl, brightDelta);
  const derivedFaded = applyDelta(userNeutralHsl, fadedDelta);

  // Step 3: extrapolate deep — continue neutral→faded trajectory one more step
  const deepDelta = { h: fadedDelta.h * 2, s: fadedDelta.s * 2, l: fadedDelta.l * 2 };
  const derivedDeep = applyDelta(userNeutralHsl, deepDelta);

  return {
    bright: hslToHex(derivedBright),
    neutral,
    faded: hslToHex(derivedFaded),
    deep: hslToHex(derivedDeep),
  };
}
