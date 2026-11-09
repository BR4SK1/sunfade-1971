// @vitest-environment happy-dom
//
// Regression coverage for the reported Firefox hydration mismatch on the
// Save button: at hydration the DOM button lacked `disabled` while React
// expected it disabled. The documented, suspected cause is Firefox's form-
// control state restoration (https://bugzilla.mozilla.org/1847798): Firefox
// can restore a control's prior dynamic `disabled` state on reload and
// ignore the `disabled` in the SSR markup. The fix under test is that bug's
// documented, Firefox-specific `autocomplete="off"` opt-out on the button.
//
// IMPORTANT LIMIT: happy-dom does NOT emulate Firefox's disabled-state
// restoration. These tests pin the SSR markup, the client hydration
// agreement, and the service-state flow; they cannot prove how real Firefox
// restores form state, so a real Firefox reload still needs manual
// confirmation.
//
// These tests use mocked save-service functions and a mocked palette context;
// they never touch the real save companion — a fetch spy asserts no real
// network request is made (the companion at 127.0.0.1:1972 must only see
// requests from the actual app).

import { act } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ModePalettes } from '../../../palette/types';

const mocks = vi.hoisted(() => ({
  fetchSavedDefaults: vi.fn(),
  saveProjectDefaults: vi.fn(),
  hydrateProjectDefaults: vi.fn(),
  saveDefaultsSucceeded: vi.fn(),
  // Mutable stand-in for the palette context value the panel consumes.
  state: {} as Record<string, unknown>,
}));

vi.mock('../../../context/usePalette', () => ({
  usePalette: () => ({
    ...mocks.state,
    hydrateProjectDefaults: mocks.hydrateProjectDefaults,
    saveDefaultsSucceeded: mocks.saveDefaultsSucceeded,
  }),
}));

// Replace only the network functions; keep the real error classes so the
// panel's instanceof branches run their actual paths.
vi.mock('../save-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../save-service')>();
  return {
    ...actual,
    fetchSavedDefaults: mocks.fetchSavedDefaults,
    saveProjectDefaults: mocks.saveProjectDefaults,
  };
});

import { ProjectSavePanel } from '../ProjectSavePanel';
import { SaveConflictError, SaveUnavailableError } from '../save-service';

const PALETTES_SAVED: ModePalettes = {
  light: { baseColors: {} as never, overrides: {} },
  dark: { baseColors: {} as never, overrides: {} },
};
const PALETTES_EDITED: ModePalettes = {
  light: { baseColors: {} as never, overrides: { 'accent.red': '#ff0000' } },
  dark: { baseColors: {} as never, overrides: {} },
};

function useStateOver(overrides: Record<string, unknown>): void {
  mocks.state = {
    modePalettes: PALETTES_SAVED,
    savedPalettes: PALETTES_SAVED,
    savedRevision: 26,
    ...overrides,
  };
}

// Every root created by a test is tracked here and unmounted inside act in
// afterEach, so no effect or pending service check outlives its test.
const renderedRoots: Root[] = [];

/** Renders the panel with the dev-only branch active (NODE_ENV=development). */
async function renderPanel(): Promise<Root> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  renderedRoots.push(root);
  await act(async () => {
    root.render(<ProjectSavePanel />);
  });
  return root;
}

function saveButton(scope: ParentNode = document.body): HTMLButtonElement {
  const button = scope.querySelector<HTMLButtonElement>('button');
  if (!button) throw new Error('Save button not rendered');
  return button;
}

function captionText(): string {
  // MUI v9 Typography variant="caption" renders as <span>, not <p>.
  const captions = Array.from(document.body.querySelectorAll('.MuiTypography-caption'));
  return captions.map((p) => p.textContent ?? '').join('|');
}

const globalScope = globalThis as Record<string, unknown>;

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  // React's act() needs this flag when using react-dom/client directly.
  globalScope.IS_REACT_ACT_ENVIRONMENT = true;
  // Hard guard for this suite: any real network attempt fails the test.
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
    throw new Error('real network access attempted in ProjectSavePanel tests');
  });
});

afterEach(async () => {
  // Unmount inside act so pending service checks and effects never leak
  // between tests.
  await act(async () => {
    for (const root of renderedRoots.splice(0)) {
      root.unmount();
    }
  });
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  // Clear the global act flag set in beforeEach.
  delete globalScope.IS_REACT_ACT_ENVIRONMENT;
});

describe('ProjectSavePanel SSR markup', () => {
  it('emits the initial disabled state with the Firefox autocomplete guard on the underlying button', () => {
    useStateOver({});
    const html = renderToString(<ProjectSavePanel />);

    const scratch = document.createElement('div');
    scratch.innerHTML = html;
    const button = scratch.querySelector('button');
    expect(button).not.toBeNull();
    expect(button!.textContent).toContain('Save Changes');
    // The hydration-mismatch guard must reach the native <button> itself.
    expect(button!.getAttribute('autocomplete')).toBe('off');
    // Initial serviceStatus is 'checking' → disabled on both server and client.
    expect(button!.hasAttribute('disabled')).toBe(true);
    expect(button!.getAttribute('disabled')).toBe('');
    expect(html).toContain('Checking for the local save service…');
  });

  it('renders no save button outside development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    useStateOver({});
    const html = renderToString(<ProjectSavePanel />);
    expect(html).not.toContain('<button');
    expect(html).toContain('available in local development only');
  });
});

describe('ProjectSavePanel hydration', () => {
  it('hydrates the SSR markup with disabled + autocomplete off and no hydration mismatch, then an available service enables the button', async () => {
    useStateOver({});
    // Deferred service check: hold it open so the just-hydrated tree is
    // still the initial checking/disabled state when we assert it.
    let resolveCheck!: (value: { palettes: ModePalettes; revision: number }) => void;
    mocks.fetchSavedDefaults.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCheck = resolve;
        }),
    );

    const consoleErrors: unknown[][] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      consoleErrors.push(args);
    });

    const html = renderToString(<ProjectSavePanel />);
    // Emotion's SSR <style> tags are not part of the client tree (in the real
    // app they live in the document head, outside the hydrated root), so
    // strip them from this synthetic container to mirror that arrangement.
    const bodyHtml = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
      .trim();
    expect(bodyHtml).toContain('<div');

    const container = document.createElement('div');
    container.innerHTML = bodyHtml;
    document.body.appendChild(container);

    await act(async () => {
      renderedRoots.push(hydrateRoot(container, <ProjectSavePanel />));
    });

    // Right after hydration, before any service update: the hydrated DOM must
    // agree with the SSR markup — disabled + autocomplete off. Remember:
    // happy-dom does NOT emulate Firefox's disabled-state restoration, so
    // this proves spec-compliant hydration agreement only, not Firefox
    // behavior.
    const button = saveButton(container);
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('autocomplete')).toBe('off');

    const hydrationProblems = consoleErrors.filter((args) =>
      /hydrat|mismatch|did not match/i.test(args.map(String).join(' ')),
    );
    expect(hydrationProblems).toEqual([]);

    await act(async () => {
      resolveCheck({ palettes: PALETTES_SAVED, revision: 26 });
    });
    expect(mocks.hydrateProjectDefaults).toHaveBeenCalledWith(PALETTES_SAVED, 26);
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('autocomplete')).toBe('off');
  });
});

describe('ProjectSavePanel client state', () => {
  it('starts disabled with autocomplete=off before the service check resolves', async () => {
    useStateOver({});
    mocks.fetchSavedDefaults.mockReturnValue(new Promise(() => {}));
    await renderPanel();

    const button = saveButton();
    expect(button.getAttribute('autocomplete')).toBe('off');
    expect(button.disabled).toBe(true);
    expect(captionText()).toContain('Checking for the local save service…');
  });

  it('enables the button and hydrates newer defaults when the service is available', async () => {
    useStateOver({});
    const defaults = {
      palettes: PALETTES_EDITED,
      revision: 26,
    };
    mocks.fetchSavedDefaults.mockResolvedValue(defaults);
    await renderPanel();

    expect(mocks.hydrateProjectDefaults).toHaveBeenCalledWith(PALETTES_EDITED, 26);
    const button = saveButton();
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('autocomplete')).toBe('off');
    expect(captionText()).toContain('All changes saved as project defaults (revision 26).');
  });

  it('stays disabled and reports unavailability when the service check fails', async () => {
    useStateOver({});
    mocks.fetchSavedDefaults.mockRejectedValue(
      new SaveUnavailableError('Could not reach the save service.'),
    );
    await renderPanel();

    expect(mocks.hydrateProjectDefaults).not.toHaveBeenCalled();
    const button = saveButton();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('autocomplete')).toBe('off');
    expect(captionText()).toContain('Save service not running — start it with: pnpm save-server');
  });

  it('saves via the mocked service only, reports success, and updates the revision', async () => {
    useStateOver({ modePalettes: PALETTES_EDITED }); // dirty vs saved
    mocks.fetchSavedDefaults.mockResolvedValue({ palettes: PALETTES_SAVED, revision: 26 });
    mocks.saveProjectDefaults.mockResolvedValue({ revision: 27 });
    await renderPanel();
    expect(saveButton().disabled).toBe(false);

    await act(async () => {
      saveButton().click();
    });

    expect(mocks.saveProjectDefaults).toHaveBeenCalledTimes(1);
    expect(mocks.saveProjectDefaults).toHaveBeenCalledWith(PALETTES_EDITED, 26);
    expect(mocks.saveDefaultsSucceeded).toHaveBeenCalledWith(27);
    // Success alert is component-local state; the savedPalettes update in the
    // caption comes from the (mocked) reducer and is covered by the reducer
    // tests, so assert the alert here.
    expect(saveButton().disabled).toBe(false);
    expect(document.body.textContent).toContain('Saved as project defaults (revision 27).');
  });

  it('surfaces a save conflict as an error alert and re-enables the button', async () => {
    useStateOver({ modePalettes: PALETTES_EDITED });
    mocks.fetchSavedDefaults.mockResolvedValue({ palettes: PALETTES_SAVED, revision: 26 });
    mocks.saveProjectDefaults.mockRejectedValue(
      new SaveConflictError('The saved project defaults changed since this page loaded.'),
    );
    await renderPanel();
    await act(async () => {
      saveButton().click();
    });

    const alert = document.body.querySelector('.MuiAlert-root');
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(document.body.textContent).toContain(
      'The saved project defaults changed since this page loaded.',
    );
    expect(saveButton().disabled).toBe(false);
  });
});
