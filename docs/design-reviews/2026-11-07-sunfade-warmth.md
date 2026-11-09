# Sunfade 1971 — Warmth Rounds 11–12 Review Record

Date: 2026-11-07
Scope: documentation only — no app source, tests, config, or generated artifacts changed by this file's creation. This record continues the score history from the ten-round record in [`2026-11-06-sunfade-theme.md`](./2026-11-06-sunfade-theme.md) (which remains verbatim and is not edited here).

## Context

Two screenshot-reviewed warmth rounds (11–12) followed the ten rounds documented in the 2026-11-06 record. Goal: modestly warm the dark background toward faded-1970s-photograph umber surfaces while keeping the distinct industrial/terminal character — "a little" warmth, not the earlier peach-heavy ink.

**Color progression of the dark bg base:** rev 8 `#232120` → Round 11 (rev 9) `#2a221c` (first distinctly umber step) → Round 12 (rev 10) `#26221f` (backed the hard-contrast panels off Round 11's chocolate lean to fit the user's "a little" brief). The actual-app candidate previews in between also tried W2 `#25211c` and a W3 risk probe (W1 bg + fg `#ebdfcb`), session-only and never persisted — neither was chosen. Dark fg stayed `#e9e0d1` throughout.

## Categories (in order)

Typography · Hierarchy · Spacing and Density · Color and Contrast · Consistency and Polish · Clarity · Overall

## Scores by round

| Round | Lead | Reviewer | Scorer | Typography | Hierarchy | Spacing and Density | Color and Contrast | Consistency and Polish | Clarity | Overall |
|---|---|---|---|---|---|---|---|---|---|---|
| 11 | Frontend | Planner | Cal | 8.5 | 8 | 7.5 | 8.8 | 8.5 | 8.4 | 8.4 |
| 11 | Frontend | Planner | Planner | 8.4 | 8.2 | 7.3 | 8.1 | 8.3 | 8 | 8.1 |
| 12 | Planner | Frontend | Cal | 8.5 | 8 | 7.5 | 8.9 | 8.5 | 8.4 | 8.5 |
| 12 | Planner | Frontend | Frontend | 8 | 8 | 8 | 9 | 9 | 8 | 9 |

As before: scores are **subjective, screenshot-based holistic judgments**, and `Overall` is a holistic call per scorer, **not an arithmetic mean**.

## What the rounds changed (and deliberately did not)

- **Only these two files were modified:** `src/palette/project-defaults.json` (dark `baseColors.bg` plus the `revision` bump each round) and the generated `MUI/sunfade-1971-theme.ts` standalone export (regenerated via `pnpm build:mui`). No snapshots, no theme source, no component/sx/layout/font or palette-algorithm changes.
- **Round 11:** saved dark bg `#232120` → `#2a221c`, revision 8 → 9. **Round 12:** `#2a221c` → `#26221f`, revision 9 → 10.
- Preserved untouched: dark fg `#e9e0d1`, every dark accent base color, the empty dark `overrides: {}` (the user's deliberate removal of the aqua overrides), the entire light palette, both fonts, and the exact `bright_orange` 1px theme focus contract. No deploy, no UI save/reset, no snapshot updates; all work remains uncommitted on top of the pre-existing dirty tree (the user's dirty state was preserved throughout).
- **Derived-color honesty:** when the background base changes, bg-blended derived colors and inks shift with it (e.g., dark `contrastText`, paper/shade roles, accent tint blends seen in the generated export). Base inputs were identical across the rounds, but **accent-derived outputs are not all bit-identical** — the claim is only that base *inputs* were untouched.
- **Revisions 9 and 10 were necessary** so stale tabs cannot treat changed defaults as the same revision through the save-companion's optimistic-concurrency check.

## Starting state and artifact regeneration

- The warmth work started from **462/463 passing tests**: the failing test was generated-artifact parity, because the saved defaults were already revision 8 (aqua overrides removed by the user) while the generated artifact still embedded the old revision-7 aqua overrides. The user **explicitly approved regenerating the standalone artifact**; Round 11's regeneration included that pre-existing aqua-override removal plus the first warm bg, and Round 12's regeneration carried the final `#26221f`. This changes app startup defaults and the generated palette/theme exports.
- No independent edits to the artifact were found or overwritten: before each regeneration the artifact was verified byte-identical to the prior verified-generated backup.

## Final verification (as directly reported by the Worker, 2026-11-07)

- `pnpm test` — **22 files / 463 tests passing**; `pnpm lint`, `pnpm typecheck`, `pnpm build:mui`, and a full `pnpm build` all pass. **No snapshot updates were needed** in either round.
- Sampled browser-computed live-vs-export rendered parity: **11 representative targets × six variants, 0 computed-style differences** in the isolated harness — a selected-component sample, not an exhaustive audit.
- Fonts loaded (Montserrat, Caskaydia); 0 console errors; no horizontal overflow in 8 sampled scenarios.
- **Contrast honesty:** current dark-medium contained-primary ink-on-fill is **≈4.5050:1 — barely above 4.5, not a comfortable margin** (rev 8 baseline ≈4.4827 and W1 ≈4.4944 were below). Sampled standard-alert **text ≥4.5** and opacity-composited **icons ≥3** across all three dark contrast variants and all four severities; soft-contrast icons measure ≈4.23–4.32 (above the 3:1 non-text guideline, below the 4.5 *text* threshold — a pre-existing condition marginally improved by the final bg). Test/stress coverage is **finite sampling, not universal proof**; **no accessibility sign-off and no universal WCAG compliance is claimed.**
- **Focus:** the exact single-1px `bright_orange` theme focus line is preserved (computed 1px `rgb(236,116,70)` verified on a keyboard-focused input). Known low contrast on light/orange fills; MUI's ButtonBase focus ripple is a separate stock effect, not a theme-authored ring, and is not universal. No accessibility sign-off.
- Light palette verified unchanged across both rounds (roles compared against prior captures); six default variants continue to render with 0 live/export parity differences; finite custom-palette checks remain meaningful.

## Evidence limitations

- **Round 11 candidate preview corrections:** the initial `*-soft/hard-buttons-*` preview captures were taken on the wrong tab (Inputs/Terminal still selected), and the first alert icon ratios omitted the 0.9 icon-wrapper opacity. Both were corrected — genuine tab-asserted recaptures and opacity-composited ratios live under `/tmp/opencode/sunfade-review/warmth-2026-11-07/candidates-verified/`, and the invalid originals are retained and explicitly marked by `/tmp/opencode/sunfade-review/warmth-2026-11-07/candidates/INVALID-FILES-NOTE.json`.
- **Round 12 report filename is misleading but the contents are verified Round 12:** `/tmp/opencode/sunfade-review/warmth-2026-11-07/round-12/round11-report.json` (a script-name artifact) — validated as Round 12 by its in-file assertions (revision 10 footer, bg0 `#26221f`, fg1 `#e9e0d1`).
- **Actual app images vs harness:** gallery/editor screenshots in these rounds are the real app. The isolated Vite harness (separate ports; round-10-era on 1973) supplied the labeled synthetic samples: rendered live/export parity, the standalone default `SnackbarContent` example, and the bg1–bg4/gray derived-shade readout (the app UI does not expose bg1/bg2 and shows no snackbar without a save action, which was forbidden). **The app itself does contain an Alert inside a Snackbar**; what was reviewed in the harness was the standalone default SnackbarContent example, not a gallery screenshot.
- All screenshot/JSON artifacts under `/tmp/opencode/sunfade-review/warmth-2026-11-07/` are **temporary and may be cleaned**; they are not part of the repository.
- No scorecard updates were made by the implementation agents; scores above record the reviewers' independent judgments after the completed rounds.
