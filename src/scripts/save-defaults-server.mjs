#!/usr/bin/env node
// Sunfade 1971 — local dev save-companion.
//
// A localhost-only companion service that writes the tracked project-defaults
// artifact (src/palette/project-defaults.json). It exists so the palette
// editor's "Save Changes" button can persist the light and dark palettes
// (base colors + overrides) as the project's actual defaults during local
// development while keeping `next build` a pure static export.
//
// Security posture (local dev only, never deployed):
// - Binds to 127.0.0.1 only; no external interfaces.
// - Requests must carry a Host header for this service (blocks Host-injection
//   via proxies) and an allowlisted dev Origin (blocks cross-site drive-by
//   writes; the required custom header forces a CORS preflight first).
// - Writes only one fixed resource; no arbitrary paths.
// - Payload validation, 64 KiB size limit, and stale-revision (409) checks.
// - Atomic write via temp file + rename in the same directory.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const PORT = 1972;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACT_PATH = path.resolve(SCRIPT_DIR, '..', 'palette', 'project-defaults.json');
const TMP_PREFIX = path.join(path.dirname(ARTIFACT_PATH), '.project-defaults.tmp-');

const ALLOWED_ORIGINS = new Set([
  `http://localhost:1971`,
  `http://127.0.0.1:1971`,
  `http://[::1]:1971`,
]);
const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`]);
const MAX_BODY_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 8000;

const MODES = ['dark', 'light'];
const BASE_COLOR_KEYS = ['red', 'green', 'yellow', 'blue', 'purple', 'aqua', 'orange', 'fg', 'bg'];
const OVERRIDE_KEYS = [
  'bg0_hard', 'bg0', 'bg0_soft', 'bg1', 'bg2', 'bg3', 'bg4',
  'fg0', 'fg1', 'fg2', 'fg3', 'fg4', 'gray',
  'bright_red', 'bright_green', 'bright_yellow', 'bright_blue', 'bright_purple', 'bright_aqua', 'bright_orange',
  'neutral_red', 'neutral_green', 'neutral_yellow', 'neutral_blue', 'neutral_purple', 'neutral_aqua', 'neutral_orange',
  'faded_red', 'faded_green', 'faded_yellow', 'faded_blue', 'faded_purple', 'faded_aqua', 'faded_orange',
  'deep_red', 'deep_green', 'deep_yellow', 'deep_blue', 'deep_purple', 'deep_aqua', 'deep_orange',
];
const HEX_COLOR = /^#[\da-f]{6}$/i;

// ── Validation (mirrors src/palette/project-defaults.ts) ────────────────

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateModePalette(value, mode) {
  if (!isRecord(value) || !isRecord(value.baseColors) || !isRecord(value.overrides)) {
    return `The ${mode} palette is missing base colors or overrides.`;
  }
  for (const key of BASE_COLOR_KEYS) {
    const color = value.baseColors[key];
    if (typeof color !== 'string' || !HEX_COLOR.test(color)) {
      return `The ${mode} palette has an invalid ${key} base color.`;
    }
  }
  for (const [key, color] of Object.entries(value.overrides)) {
    if (!OVERRIDE_KEYS.includes(key)) {
      return `The ${mode} palette has an unknown color override: ${key}.`;
    }
    if (typeof color !== 'string' || !HEX_COLOR.test(color)) {
      return `The ${mode} palette has an invalid ${key} override color.`;
    }
  }
  return null;
}

/** Validates a POST payload; returns { ok, palettes?, error? }. */
export function validateSavePayload(value) {
  if (!isRecord(value)) {
    return { ok: false, error: 'The save payload is not a JSON object.' };
  }
  if (!Number.isInteger(value.baseRevision) || value.baseRevision < 0) {
    return { ok: false, error: 'The save payload has an invalid baseRevision.' };
  }
  if (!isRecord(value.palettes)) {
    return { ok: false, error: 'The save payload is missing its palettes.' };
  }
  const palettes = {};
  for (const mode of MODES) {
    const error = validateModePalette(value.palettes[mode], mode);
    if (error) return { ok: false, error };
    palettes[mode] = value.palettes[mode];
  }
  return { ok: true, palettes };
}

/** Validates the artifact document read from disk; returns { ok, revision?, error? }. */
export function validateArtifactDocument(value) {
  if (!isRecord(value) || !Number.isInteger(value.revision) || value.revision < 1) {
    return { ok: false, error: 'The project defaults artifact has an invalid revision.' };
  }
  if (!isRecord(value.palettes)) {
    return { ok: false, error: 'The project defaults artifact is missing its palettes.' };
  }
  for (const mode of MODES) {
    const error = validateModePalette(value.palettes[mode], mode);
    if (error) return { ok: false, error };
  }
  return { ok: true, revision: value.revision };
}

// ── File handling ────────────────────────────────────────────────────────

function readArtifact() {
  return fs.readFileSync(ARTIFACT_PATH, 'utf8');
}

/** Atomically replaces the artifact file. */
export function writeArtifact(document) {
  const serialized = `${JSON.stringify(document, null, 2)}\n`;
  const tmpPath = `${TMP_PREFIX}${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmpPath, serialized, { flag: 'wx' });
    fs.renameSync(tmpPath, ARTIFACT_PATH);
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // rename already moved the temp file; nothing to clean up.
    }
  }
}

// ── Request handling ─────────────────────────────────────────────────────

function corsHeaders(origin) {
  const headers = { 'Vary': 'Origin' };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function reject(res, status, message, origin) {
  const headers = { 'Content-Type': 'text/plain; charset=utf-8', ...corsHeaders(origin) };
  res.writeHead(status, headers);
  res.end(message);
}

function checkClient(req, origin) {
  const host = req.headers.host;
  if (!host || !ALLOWED_HOSTS.has(host)) {
    return `Rejecting request with unexpected Host header.`;
  }
  if (req.method === 'POST' && (!origin || !ALLOWED_ORIGINS.has(origin))) {
    return 'Rejecting request from a non-allowlisted origin.';
  }
  return null;
}

function readBody(req) {
  return new Promise((resolve, rejectPromise) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      if (tooLarge) {
        // Discard remaining chunks so the socket can drain; the response
        // will carry `Connection: close` because the body was not consumed.
        return;
      }
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        rejectPromise(new Error('Payload exceeds the size limit.'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', rejectPromise);
  });
}

async function handleGet(req, res, origin) {
  let document;
  try {
    document = JSON.parse(readArtifact());
  } catch {
    reject(res, 500, 'The project defaults artifact is unreadable.', origin);
    return;
  }
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(origin) };
  res.writeHead(200, headers);
  res.end(JSON.stringify(document));
}

async function handlePost(req, res, origin) {
  const contentType = req.headers['content-type']?.split(';')[0]?.trim();
  if (contentType !== 'application/json') {
    reject(res, 400, 'Expected Content-Type: application/json.', origin);
    return;
  }
  if (req.headers['x-sunfade-save'] !== '1') {
    reject(res, 403, 'Missing the X-Sunfade-Save header.', origin);
    return;
  }

  let raw;
  try {
    raw = await readBody(req);
  } catch {
    reject(res, 413, 'Payload exceeds the size limit.', origin);
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    reject(res, 400, 'The save payload is not valid JSON.', origin);
    return;
  }

  const validated = validateSavePayload(payload);
  if (!validated.ok) {
    reject(res, 400, validated.error, origin);
    return;
  }

  let current;
  try {
    current = JSON.parse(readArtifact());
  } catch {
    reject(res, 500, 'The current project defaults artifact is unreadable.', origin);
    return;
  }
  const currentArtifact = validateArtifactDocument(current);
  if (!currentArtifact.ok) {
    reject(res, 500, `The current project defaults artifact is invalid: ${currentArtifact.error}`, origin);
    return;
  }
  if (payload.baseRevision !== currentArtifact.revision) {
    res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) });
    res.end(JSON.stringify({ error: 'conflict', currentRevision: currentArtifact.revision }));
    return;
  }

  const nextDocument = { revision: currentArtifact.revision + 1, palettes: validated.palettes };
  writeArtifact(nextDocument);
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) });
  res.end(JSON.stringify({ revision: nextDocument.revision }));
}

const server = http.createServer((req, res) => {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;

  if (req.method === 'OPTIONS') {
    const headers = {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Sunfade-Save',
      'Access-Control-Max-Age': '600',
      ...corsHeaders(origin),
    };
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const hostError = checkClient(req, origin);
  if (hostError) {
    reject(res, 403, hostError, origin);
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (url.pathname !== '/defaults') {
    reject(res, 404, 'Unknown resource.', origin);
    return;
  }

  if (req.method === 'GET') {
    void handleGet(req, res, origin);
    return;
  }
  if (req.method === 'POST') {
    void handlePost(req, res, origin);
    return;
  }
  reject(res, 405, 'Method not allowed.', origin);
});

server.headersTimeout = REQUEST_TIMEOUT_MS;
server.requestTimeout = REQUEST_TIMEOUT_MS;

export function startServer() {
  server.listen(PORT, HOST, () => {
    console.log(`Save-companion listening on http://${HOST}:${PORT} (writes ${path.relative(process.cwd(), ARTIFACT_PATH)})`);
  });
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const artifact = validateArtifactDocument(JSON.parse(readArtifact()));
    if (!artifact.ok) {
      console.error(`Refusing to start: ${artifact.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Refusing to start: cannot read the project defaults artifact (${error.message}).`);
    process.exit(1);
  }
  startServer();
}
