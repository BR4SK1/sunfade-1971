# Sunfade 1971 — Ten-Round MUI Theme Redesign Review Record

Date: 2026-11-06
Scope: documentation only — no app source or configuration changed in this file's creation.

This record preserves the category scores requested by the user from **Cal** (primary/coordinator) and the **opposing reviewer** for each of the ten authorized theme-iteration rounds (two consecutive five-round series). Scores are **subjective, screenshot-based holistic judgments** of the rendered evidence for each round — not measured metrics. The `Overall` score is a holistic call by each scorer and is **not necessarily an arithmetic mean** of the other categories.

## Categories (in order)

Typography · Hierarchy · Spacing and Density · Color and Contrast · Consistency and Polish · Clarity · Overall

## Scores by round

| Round | Lead | Reviewer | Scorer | Typography | Hierarchy | Spacing and Density | Color and Contrast | Consistency and Polish | Clarity | Overall |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Frontend | Planner | Cal | 7 | 6.5 | 7 | 7.5 | 7 | 7 | 7 |
| 1 | Frontend | Planner | Planner | 7 | 7 | 7 | 7.5 | 7.5 | 7.5 | 7.3 |
| 2 | Planner | Frontend | Cal | 8 | 7.5 | 7.5 | 7.5 | 7.5 | 8 | 7.6 |
| 2 | Planner | Frontend | Frontend | 8 | 8 | 8 | 8 | 8 | 8 | 8 |
| 3 | Frontend | Planner | Cal | 8.5 | 7.5 | 7.5 | 7.5 | 8 | 8 | 7.8 |
| 3 | Frontend | Planner | Planner | 8 | 7.5 | 7 | 7.5 | 7.9 | 7.7 | 7.6 |
| 4 | Planner | Frontend | Cal | 8.5 | 7.5 | 7.5 | 8.5 | 8 | 8 | 8 |
| 4 | Planner | Frontend | Frontend | 8 | 8 | 8 | 8 | 8 | 8 | 8 |
| 5 | Frontend | Planner | Cal | 8.5 | 8 | 7.5 | 8.5 | 8 | 8.5 | 8.1 |
| 5 | Frontend | Planner | Planner | 8.4 | 8.1 | 7.3 | 8.2 | 8.2 | 8 | 8.1 |
| 6 | Planner | Frontend | Cal | 8.5 | 8 | 7.5 | 8.5 | 8.2 | 8.5 | 8.1 |
| 6 | Planner | Frontend | Frontend | 8 | 8 | 8 | 8 | 8 | 8 | 8 |
| 7 | Frontend | Planner | Cal | 8.5 | 8 | 7.5 | 8.6 | 8.4 | 8.3 | 8.2 |
| 7 | Frontend | Planner | Planner | 8.4 | 8.2 | 7.3 | 8.3 | 8.3 | 8 | 8.2 |
| 8 | Planner | Frontend | Cal | 8.5 | 8 | 7.5 | 8.6 | 8.4 | 8.2 | 8.2 |
| 8 | Planner | Frontend | Frontend | 8 | 8 | 8 | 9 | 9 | 8 | 8 |
| 9 | Frontend | Planner | Cal | 8.5 | 8 | 7.5 | 8.7 | 8.5 | 8.4 | 8.3 |
| 9 | Frontend | Planner | Planner | 8.4 | 8.2 | 7.3 | 8.3 | 8.4 | 8.1 | 8.2 |
| 10 | Planner | Frontend | Cal | 8.5 | 8 | 7.5 | 8.7 | 8.5 | 8.4 | 8.3 |
| 10 | Planner | Frontend | Frontend | 8 | 8 | 8 | 9 | 9 | 8 | 9 |

## Round summaries

1. **Round 1 — palette shift (cassette-futurism/mainframe):** replaced the Gruvbox-adjacent brown/cream + olive/ochre/teal defaults with graphite shell, peach-paper foreground, vermilion primary, leaf green, denim/petrol blue, plum and petrol aqua; regenerated the standalone MUI artifact; established the generated-artifact/working-source parity check.
2. **Round 2 — headings and selected toggles:** compact industrial heading scale (Montserrat headings kept, Caskaydia body/terminal kept) and a shared-theme fix pinning selected-toggle hover to the solid inverse band (MUI's own `selected:hover` wash had made light-mode selections illegible).
3. **Round 3 — input fonts and h1:** standard/underline inputs moved to the same Montserrat chrome stack as outlined/filled (base body/terminal stack and data readouts stay Caskaydia); h1 weight raised to 700 over the unchanged scale.
4. **Round 4 — neutral ivory enclosure:** dark foreground family desaturated to warm putty ivory (`#efd9c2` → `#e9e0d1`) so vermilion carries the warmth; only the dark `fg` base changed, all derived tiers recomputed by the engines.
5. **Round 5 — subtitle/overline tokens + revision correction:** deliberate `subtitle1`/`subtitle2`/`overline` instrument-label tokens (caption untouched); project-defaults revision corrected 6 → 7 because Round 4 had changed palette content without bumping the revision (stale revision-6 clients could otherwise silently overwrite the new defaults through the save-companion's optimistic-concurrency check).
6. **Round 6 — standard/outlined input border consistency:** rest and hover input boundaries pinned to the same 1px frame role (Standard `::before` underline plus hover rules that exclude disabled/error; Outlined hover excluding focused/error), so the frame does not thicken or shift on hover; the focus treatment stays the exact single-1px mode-specific `bright_orange` line including hover+focus; touch-emulated (hover: none) rendering matches rest.
7. **Round 7 — palette-derived standard-alert tints:** standard alerts no longer sit on raw background — their fill is an accent tint blended into `roles.background` (`ALERT_TINT_STRENGTH`) and their ink is the accent main pulled toward the foreground tier (`ALERT_INK_PULL`), both derived from the active palette; a stronger-tint candidate was rejected in an A/B comparison. Measured worst text/icon contrast on the adopted values was recorded from the browser.
8. **Round 8 — Paper shadows flattened + alert-comment corrections:** `MuiPaper.root` shadows flattened (`boxShadow: 'none'`); the actual Card surfaces were already flat, and the residual stock shadow existed on plain non-card Paper and a color-picker inner elevation-8 sheet — note that unframed, same-tone nested Paper/Card surfaces can now visually merge into their parent. Alert interpolation/coverage comments were corrected for accuracy, and a finite stress probe (144 total cases across 6 sampled custom palettes — 2 modes × 3 contrasts × 4 severities per palette) was recorded with zero failures for the specified thresholds — a sample, not a universal guarantee.
9. **Round 9 — SnackbarContent treatment:** SnackbarContent moved onto the palette's paper/text roles with a 1px frame, verified before/after in an isolated actual-MUI/theme harness on its own port — **not** the current app — with measured ink contrast per variant; a silently-passing action-ink test was subsequently hardened to fail explicitly when the expected rule is absent.
10. **Round 10 — acceptance-focused final verification (no source edits):** this round was explicitly verification-focused, not another visual redesign — no theme, app, or test source was changed. It gathered acceptance evidence: browser-computed input-state matrices — desktop states across all six variants (rest/hover/focus/hover+focus/error/disabled) plus touch-emulated runs at medium only — identification of MUI's stock focus-visible pulsating ripple as the gray shape on focused toggles/actions, sampled live-vs-export rendered parity, standard alerts/Cards/overlays and SnackbarContent on page and paper backgrounds, and mobile-drawer lower-control reachability.

## Evidence artifacts (temporary, external)

Screenshot evidence for every round lives under `/tmp/opencode/sunfade-review/` (`baseline/`, `round-1/` … `round-10/`, plus capture scripts and pre-round backups). **These are temporary artifacts in `/tmp` and may be cleaned at any time**; they are not part of the repository. The screenshot-capture permission is configured separately in the shared Frontend configuration.

## Known caveat (deliberate, user-directed — corrected wording)

The exact single-1px `bright_orange` focus line is an explicit, documented user-accepted trade-off. It remains 1px as theme-authored, with **no extra theme-authored ring added**; on light surfaces and on orange fills it can have low contrast. The theme does not add a second focus indicator of its own, but it also does not remove MUI's built-in ones: MUI's stock focus-visible pulsating ripple (a ButtonBase effect, not a theme-authored ring) was actually observed during Round 10 on sampled ButtonBase-derived controls — the dark/light toggle and a snackbar action button — at 0/500/2000 ms checkpoints as applicable. That observation is sampled, **not demonstrated for every control**, and the ripple is not a focus ring; it should not be counted as a deliberate second indicator. Inputs and other non-ButtonBase fields do not receive that ripple — the sampled ButtonBase ripple does not apply to those inputs — and this record makes no claim about whether any other cue may or may not exist for them. **No accessibility sign-off is claimed for the theme, and no universal WCAG compliance is claimed.**

## Verified checks (as observed at final run, 2026-11-06)

- `pnpm test` final summary (verbatim):

  ```
   Test Files  18 passed (18)
        Tests  403 passed (403)
   Start at  22:34:03
   Duration  1.41s (import 55%, transform 28%, tests 16%, worker 2%)
  ```

- Test-only run (no `-u`, no test/snapshot changes). The **final 18 test files / 403 tests passing was directly rerun and observed** for this record. Earlier rounds' counts (17 files / 389–401 tests) were reported by the working agent during those rounds and are not independently re-verifiable now; this record does not speculate about why the earlier printed file count differed. The +2 tests between the last earlier count (401) and the final count (403) correspond to the Round-5 `headingTypography` additions.
- `pnpm build:mui`, `pnpm lint`, `pnpm typecheck`, and a full `pnpm build` (static export) all passed in the final round; the standalone artifact contains all six theme variants.
- The pre-existing local dev server (`next dev`, port 1971) was **reused for screenshots, not started, deployed, or restarted**; no deployment or save operation was performed.
- All pre-existing uncommitted user work was preserved throughout: the rounds were built directly on the already-dirty tree without any reset, revert, or cleanup, and the work added new untracked review documentation (this file) and new theme tests on top of it — so the overall dirty pattern did **not** stay unchanged.

## Verified checks — second five rounds (6–10, as observed at the Round 10 final run, 2026-11-06)

- `pnpm test` final summary (verbatim, Round 10):

  ```
   Test Files  22 passed (22)
        Tests  463 passed (463)
  ```

- `pnpm lint`, `pnpm typecheck`, `pnpm build:mui`, and a full `pnpm build` all passed in Round 10. `pnpm build:mui` regenerated the standalone artifact **byte-identical** to the pre-run file (verified by diff against a pre-run backup), confirming the export is in sync with the shared source at revision 7.
- Browser-rendered live-vs-export parity was verified by computed styles in an isolated harness: **11 selected representative components × all six variants, 0 computed-style differences**. This covers only the selected components measured — it is not an exhaustive component audit.
- App gallery evidence: fonts loaded (Montserrat and Caskaydia confirmed via `document.fonts`), **0 console errors**, all nine tabs captured for dark and light, horizontal-overflow checks run on **four sampled scenarios only**, and the mobile editor drawer was actually wheel-scrolled to its lower controls in dark and light (medium) with Save/Reset/Scheme/Export visible and **no save/reset activated** (status line unchanged, revision 7). Reachability was verified for the drawer bottom in two modes — **not every control in every tab was individually audited**.
- Browser-captured CSS evidence and its limits: input-state matrices were measured via computed styles in real browser contexts (including pseudo-elements and the outlined fieldset notch). Touch-emulated contexts were not keyboard-focus tested (no focus probe in touch scenarios), and hover+focus was sampled on the Standard input only. Custom-palette alert stress coverage is a finite sample (144 total cases across 6 sampled custom palettes, zero failures for the specified thresholds only), not a universal guarantee.
- Round 10 itself made **no source edits** (the pre-existing dirty tree of 20 modified/untracked entries was preserved exactly); no snapshots were updated, no deploy or save-defaults operation was performed, and the separate screenshot permission was used as before.

## Evidence honesty notes (rounds 6–10)

- **Round 8 pre-state screenshots:** the initial `*-pre` screenshots and pre metrics were inadvertently captured **after** the dev server had hot-reloaded the Round 8 changes, so they show post-change styling; the true pre-change Paper shadow value was obtained by browser-computed measurement after temporarily restoring the prior style. Cards were already flat before Round 8. The dev server did hot-reload temporarily during Round 8's before/after work — no claim of a hot-reload-free server is made.
- **Round 10 invalid captures, preserved and marked:** the first mobile drawer "light" image was actually dark (the app ignores `?mode=` query parameters); it is retained as `round-10/drawer-scroll/drawer-bottom-light.INVALID-dark-mode.png`, and the corrected light capture selected the mode with the drawer's real Light toggle, with selected-toggle state and computed body background recorded before scrolling. The first Round 10 input matrix's `*-soft`/`*-hard` rows actually measured **medium** (the app also ignores `?contrast=`); that matrix is retained as `input-states/matrix.INVALID-soft-hard-as-medium.json`, and the corrected matrix is **`input-states/matrix-v2.json`**, captured after real UI selection with per-scenario checks of selected toggles and computed body background against known per-variant ground truth (all 8 scenarios passed validation).
- **Query-parameter scope:** the URL query-parameter issue affects only scripts that sent `?mode=`/`?contrast=` to the app itself. It does **not** affect the gallery capture script (which clicks the real mode/contrast toggles) or the isolated round-9/round-10 Vite harnesses (whose own code parses the query parameters and passes them as arguments to the theme builders — verified in their source).
- **Evidence lifetime:** all Round 6–10 evidence lives under `/tmp/opencode/sunfade-review/{baseline-round-6,round-6,...,round-10}` (screenshots, computed-style JSON, capture scripts) and is temporary — it may be cleaned at any time and is not part of the repository.
- No deployment, save-defaults, or reset operation was performed in any of Rounds 6–10; the pre-existing dirty tree and the separately configured screenshot permission were used unchanged throughout.
