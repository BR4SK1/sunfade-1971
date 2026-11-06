// Dev-only client for the save-companion service (src/scripts/save-defaults-server.mjs).
// The companion is a localhost-only Node server that writes the tracked
// project-defaults artifact; it is never deployed and the production build
// never calls it.

import { parseProjectDefaults, type ProjectDefaults } from '../../palette/project-defaults';
import type { ModePalettes } from '../../palette/types';

export const SAVE_SERVICE_URL = 'http://127.0.0.1:1972';

/** The save service is not reachable (companion not running). */
export class SaveUnavailableError extends Error {}

/** The artifact changed since this page loaded; the save was rejected. */
export class SaveConflictError extends Error {}

/** The save service rejected the payload as invalid. */
export class SaveValidationError extends Error {}

function serviceHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    // Custom header forces a CORS preflight, so cross-site pages cannot send
    // a "simple request" that bypasses the companion's origin checks.
    'X-Sunfade-Save': '1',
  };
}

async function assertServiceOk(response: Response, fallbackMessage: string): Promise<void> {
  if (response.status === 409) {
    throw new SaveConflictError(
      'The saved project defaults changed since this page loaded. Reload the page to pick them up, then re-apply any edits you want to keep.',
    );
  }
  if (response.status === 400) {
    throw new SaveValidationError('The save service rejected the palette payload as invalid.');
  }
  if (!response.ok) {
    throw new SaveUnavailableError(fallbackMessage);
  }
}

export async function fetchSavedDefaults(): Promise<ProjectDefaults> {
  let response: Response;
  try {
    response = await fetch(`${SAVE_SERVICE_URL}/defaults`, { headers: serviceHeaders() });
  } catch {
    throw new SaveUnavailableError('Could not reach the save service. Is the dev companion running? (pnpm save-server)');
  }
  await assertServiceOk(response, 'The save service returned an unexpected response.');
  try {
    return parseProjectDefaults(await response.json());
  } catch {
    throw new SaveUnavailableError('The save service returned invalid project defaults.');
  }
}

export async function saveProjectDefaults(
  palettes: ModePalettes,
  baseRevision: number,
): Promise<{ revision: number }> {
  let response: Response;
  try {
    response = await fetch(`${SAVE_SERVICE_URL}/defaults`, {
      method: 'POST',
      headers: serviceHeaders(),
      body: JSON.stringify({ baseRevision, palettes }),
    });
  } catch {
    throw new SaveUnavailableError('Could not reach the save service. Is the dev companion running? (pnpm save-server)');
  }
  await assertServiceOk(response, 'The save service returned an unexpected response.');
  try {
    const body = (await response.json()) as { revision?: unknown };
    if (typeof body?.revision !== 'number') {
      throw new Error('missing revision');
    }
    return { revision: body.revision };
  } catch {
    throw new SaveUnavailableError('The save service did not confirm the save.');
  }
}
