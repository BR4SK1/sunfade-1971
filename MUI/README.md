# Sunfade 1971 — standalone MUI theme artifacts

This folder holds distributable theme artifacts, generated outside `src/`.
It is not site source; do not hand-edit the generated files.

## Contents

- `sunfade-1971-theme.ts` — the complete six-variant standalone MUI theme
  (light/dark × soft/medium/hard), depending only on `@mui/material`.

## Typography

The themes use a two-font system, both licensed under the SIL Open Font
License 1.1 (redistribution permitted):

- **Caskaydia Cove Nerd Font** (Cascadia Code with the Nerd Fonts patch,
  <https://github.com/ryanoasis/nerd-fonts>) — the base face for body text
  and monospaced code/terminal/data readouts. Requested via the
  `--font-sunfade-caskaydia` CSS variable, falling back to the installed
  `"CaskaydiaCove Nerd Font"` family and then a standard system monospace
  stack.
- **Montserrat** (<https://fonts.google.com/specimen/Montserrat>) — the
  UI-chrome face for headings, subtitles, captions, labels, buttons and other
  ordinary controls. Requested via the `--font-sunfade-montserrat` CSS
  variable, falling back to the installed `"Montserrat"` family and then a
  standard system sans-serif stack.

Without the fonts, every variant remains fully usable.

To get the authentic faces in your app:

1. Self-host the font files and keep their license notices with your
   distribution.
2. Either expose the CSS variables the themes expect — e.g. on a wrapping
   element:

   ```css
   .sunfade-theme-host {
     --font-sunfade-caskaydia: "CaskaydiaCove Nerd Font";
     --font-sunfade-montserrat: "Montserrat";
   }
   ```

   — or simply install the fonts under their native family names
   (`CaskaydiaCove Nerd Font`, `Montserrat`); the fallbacks in the theme pick
   them up automatically.

## Regenerating

```sh
pnpm build:mui
```

The build reads the saved project defaults (`src/palette/project-defaults.json`),
validates them with the same parser the app uses, and writes the generated
module here. Output is deterministic (no timestamps): repeated runs over
unchanged defaults are byte-identical, and the test suite regenerates the
module and compares it against the committed artifact to catch drift.

For usage examples (default export, `getSunfadeTheme`, variant selection), see
the generated module's header comments and the "MUI theme export" section of
the repository README.
