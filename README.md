# Sunfade 1971

A warm, retro-inspired color palette playground. Tune a palette, preview it across a component gallery, and export it for your projects.

Sunfade 1971 is an independent palette inspired by the warm, earthy approach of [Gruvbox](https://github.com/morhetz/gruvbox). Its default colors are a distinct Sunfade palette.

## Run locally

Requirements: Node.js 22.12 or newer and pnpm 10.

```sh
pnpm install
pnpm dev
```

Open <http://localhost:1971>.

For palette editing with project-defaults persistence, start the dev
environment with `./src/scripts/dev.sh`, which runs the save-companion (port
1972) alongside the dev server (port 1971). Alternatively run the companion
separately with `pnpm save-server`.

## Commands

```sh
pnpm dev        # Start the Next.js development server on port 1971
pnpm save-server # Start the save-companion on port 1972 (writes project defaults)
pnpm build:mui  # Regenerate the standalone MUI theme in MUI/ from saved project defaults
pnpm build      # Build the static site into out/
pnpm typecheck  # Check TypeScript types
pnpm test       # Run palette and serializer tests
```

Development/build scripts live in `src/scripts/` (including `dev.sh`, the
one-command dev environment). Distributable theme artifacts are written to
target folders outside `src/`: `MUI/` for the standalone MUI theme.

Husky installs the local Git hooks during `pnpm install`. The pre-commit hook
runs `pnpm check` (ESLint, the full TypeScript check, and production build)
regardless of changed paths; the pre-push hook runs the full `pnpm test` suite.
These hooks check and test only—deployments are never triggered by a hook. Run
`pnpm lint` directly to run ESLint without the typecheck or production build.
The existing Conventional Commit message hook remains enabled.

The app is statically exported to `out/` and runs entirely in the browser, with no database or API server required. Save and load light/dark palette schemes as portable JSON files from the editor; palette version history is not implemented yet.

### Deploy to the local K3s cluster

Deployments are manual only. Set an explicit image tag; the common deploy
entrypoint builds and publishes the image and applies the manifest. It is not
attached to commit or push hooks:

```sh
IMAGE_TAG="$(git rev-parse --short HEAD)" ./src/scripts/deploy.sh
```

The local deployment is available at <https://sunfade.local.brasky-house.com> and <http://192.168.1.10:5107>.

The Soft, Medium, and Hard contrast settings change the preview's surfaces, text, borders, inputs, and accent roles in either mode. Palette swatches and CSS/terminal exports retain the underlying colors; the MUI theme export contains all six mode/contrast combinations.

The interface follows a full-color terminal style: inverse header bands, squared components with 1–2px corners, and a consistent 1px single-line rule for every remaining frame, border, control outline (including outlined buttons), divider, and focus outline. Region frames are reserved for what they enclose — the workspace (sidebar edge), previews, and floating overlays (menus, popovers, dialogs, the mobile editor drawer) — while interiors stay mostly borderless: palette swatches and ordinary icon actions rely on surface tone and spacing instead of standing frames. Accordions carry the same 1px frame as every other framed surface, with borderless interiors — an expanded summary only grows taller; no interior divider is drawn. In the palette editor, adjacent accent accordions overlap by 1px so the seam between their frames reads as a single line. Explicitly outlined MUI variants (outlined buttons, cards, papers, chips) keep their visible outlines, inputs keep their boundaries, and filled inputs lift to a lighter tier with the keyboard-focus border drawn in the exact `bright_orange` palette swatch. Keyboard focus everywhere — buttons, toggles, tabs, icon actions, accordion summaries, inputs — renders as a single 1px outline/border in that `bright_orange` tone, a deliberately bold treatment chosen explicitly (it reads clearly against the dark page background in every dark variant, but sits below the 3:1 non-text contrast WCAG asks of a focus indicator against the light-mode surfaces, and it disappears against the bright-orange hover fill of primary controls — orange on orange; it is not a contrast-optimized indicator). Selected toggles stand out with inverse video (the header band plus its own high-contrast ink) independently of the 1px focus outline.

## Typography

The UI uses a two-font system, both self-hosted in `src/fonts/` and loaded
with `next/font/local` in `src/app/layout.tsx`. Each face is exposed as a CSS
variable that the shared theme options reference, so the live preview and the
MUI theme export use identical font stacks:

- **Montserrat** (variable weight 100–900) — the UI-chrome face for headings,
  subtitles, captions, labels, buttons and other ordinary controls, exposed as
  the `--font-sunfade-montserrat` CSS variable. Redistributed under its SIL
  OFL 1.1 license; the full license text ships with it at
  `src/fonts/LICENSE-Montserrat.txt`.
- **Caskaydia Cove Nerd Font** (Cascadia Code with the Nerd Fonts patch) — the
  base face for paragraphs, general body copy, and monospaced code, terminal
  and data readouts, exposed as the `--font-sunfade-caskaydia` CSS variable.
  Redistributed under its SIL OFL 1.1 license; the full license text ships
  with it at `src/fonts/LICENSE-CaskaydiaCove.txt`.

If a font fails to load, every surface falls back to a standard system
sans-serif or monospace stack (per face) and remains fully usable.

Standalone MUI theme consumers get the same behavior: the exported themes
request the two fonts through the `--font-sunfade-montserrat` and
`--font-sunfade-caskaydia` CSS variables with portable `Montserrat` and
`CaskaydiaCove Nerd Font` family fallbacks. To get the authentic faces in
your app, self-host the font files (license permitting, which the OFL does)
and either register those variables on a wrapping element or install the
fonts under their `Montserrat` and `CaskaydiaCove Nerd Font` family names.

## MUI theme export

The editor's **MUI Theme (.ts) — all six variants** export writes
`sunfade-1971-theme.ts`: a standalone TypeScript module that depends only on
`@mui/material` and contains every Sunfade variant — light/dark ×
soft/medium/hard — resolved from both edited mode palettes. The export is built
from the same shared theme-options source that drives the live preview, so
exported themes always match what you saw in the editor.

Use the default export (the dark/medium variant) with `ThemeProvider` and
`CssBaseline`:

```tsx
import { ThemeProvider, CssBaseline } from '@mui/material';
import sunfadeTheme from './sunfade-1971-theme';

export default function App() {
  return (
    <ThemeProvider theme={sunfadeTheme}>
      <CssBaseline />
      <YourApp />
    </ThemeProvider>
  );
}
```

Or pick any variant with the typed selector:

```tsx
import { getSunfadeTheme } from './sunfade-1971-theme';

const theme = getSunfadeTheme('light', 'hard');
<ThemeProvider theme={theme}>...</ThemeProvider>
```

The module also exports:

- `SUNFADE_VARIANTS` — all six variant keys as `SunfadeVariant`
  (`'dark-soft' | 'dark-medium' | 'dark-hard' | 'light-soft' | 'light-medium' | 'light-hard'`).
- `DEFAULT_SUNFADE_VARIANT` — `'dark-medium'`, the variant behind the default export.
- `sunfadePalettes` — the raw base colors and overrides for each mode, exactly
  as edited in the Sunfade 1971 editor.
- `sunfadeThemeOptions` — the prebuilt `createTheme` options per variant, if you
  want to compose them with further overrides before creating a theme yourself.
- `sunfadeThemes` / `getSunfadeTheme` — fully created `Theme` objects.

The generated module augments the MUI palette with Sunfade's custom roles
(`orange`, `terminalHeader`, `frame`, and the `darker` accent shade), so the
exported types stay intact. The output is deterministic (no timestamps), making
it safe to commit and diff.

### Standalone MUI theme artifact (`MUI/`)

The repository also ships the complete six-variant standalone theme as a
reproducible build artifact. `pnpm build:mui` reads the saved project defaults
(`src/palette/project-defaults.json`, written by the save-companion), validates
them with the same parser the app uses, and writes the generated module to
`MUI/sunfade-1971-theme.ts` — byte-identical to what the editor's MUI export
button downloads, since both are produced by the same serializer from the same
shared theme-options source.

The build is deterministic: running it twice over unchanged defaults produces
byte-identical output, and the test suite includes a parity test that
regenerates the module from the tracked defaults and compares it with the
committed artifact. Regenerate with `pnpm build:mui` after saving new defaults
through the editor; the artifact lives outside `src/` because it is a
distributable theme file, not site source.

## Commit messages

This repository uses [Conventional Commits](https://www.conventionalcommits.org/). Commit messages are checked automatically by a Git hook installed when dependencies are installed.

```text
<type>[optional scope]: <description>
```

Common types include `feat`, `fix`, `docs`, `refactor`, `test`, and `chore`:

```text
feat(palette): add palette import
fix(editor): keep the mobile drawer open while editing
docs: document static deployment
```

Use `!` after the type or scope for a breaking change, for example `feat!: remove legacy palette format`.

## Stack

- React 19 and TypeScript
- Next.js 16 App Router
- Material UI 9
- Vitest 5

## License

[ISC](LICENSE)
