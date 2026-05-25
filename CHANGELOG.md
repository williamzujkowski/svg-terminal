# Changelog

## v0.8.0 — 2026-05-25

A polish + 8-blocks release. Cursor animation bug fixed (cursor now sits ON emerging characters; doesn't blink invisible during typing). Watch-mode survives delete+recreate. Static-SVG paths slimmed. Eight new blocks across animated + practical categories.

### ⚠️ Deprecations

- **`animation.cursorBlinkCycle`** still in the schema but the typing-time cursor is now solid (the previous blink was the cause of the cursor-animation bug). The field will be removed in v1.0. Same trajectory as `charAppearDuration` (deprecated in v0.7).

### Fixes

- **Cursor animation bug** — cursor used to land on column N+1 at the instant char N emerged (so it visually led typed chars) AND blink invisible for ~333 ms out of every 1000 ms (so chars appeared without a visible cursor). Now lag-by-one + solid during typing. Decided by 7-agent nexus consensus vote, 100% approve option A.
- **`--watch` survives file delete + recreate** (`#76`). Was binding `fs.watch` to the inode; vim's atomic-save + plain `rm`-then-`touch` detached the watcher silently. Now watches the parent directory and filters by basename.

### Performance

- **One fewer `<defs>` block per animated SVG** (`#74` + `#75`). Viewport clipPath moved from `renderTerminalContent` into the top-level defs. ~20 bytes saved.

### DX

- **Hint for `accessibility: false`** (`#77`). User passes a boolean expecting a "disable" shortcut; now gets `hint: to disable accessibility descriptions, use \`accessibility: { describe: false }\` (not a boolean).`
- **`registerTheme({ name: 'random' })` throws** (`#78`). `random` is reserved (triggers daily rotation). Was silently shadowing.
- **Negative `CacheRuntime.ttl` fails fast** (`#80`). `makeUseCache` throws on construction instead of `pruneStaleEntries` silently no-op'ing.
- **CI exercises the cache code path end-to-end** (`#79`). New smoke step runs `--refresh-cache` + `cache check` + `--frozen-cache` against a small dynamic-block fixture. Catches read/write/path regressions that unit tests can miss.

### New blocks (+8, registry 38 → 46)

**Animated:**
- `ascii-clock` — HH:MM:SS with pulsing colon, 12h / 24h
- `progress-bar` — fake build bar that fills 0% → 100% in 5% steps
- `bouncing-dot` — single glyph ping-pongs left ↔ right
- `dice-roll` — N d6 dice tumble and land on a result (deterministic per-day)

**Practical:**
- `palette-swatch` — one-line render of the 16 named theme colors
- `semver-bump` — current version + major/minor/patch bump preview
- `ascii-calendar` — current-month grid with today bolded
- `toc` — markdown TOC with GitHub-flavored anchor slugs

### Docs

- **Honest a11y note** about SMIL ↔ `prefers-reduced-motion` gap. README's accessibility section and CONTRIBUTING both call it out; pointer to `--static` for motion-sensitive contexts. The architectural fix is tracked in `#71`.

### Tests

- 233 → 276 tests (+43 since v0.7 → +21 in this release).

### Deferred (still open)

- `#69` refactor frame-cycle to single text + content cycling
- `#70` consolidate per-scroll animateTransform
- `#71` SMIL prefers-reduced-motion (needs design vote)
- `#72` snapshot-file structuring helper

## v0.7.0 — 2026-05-24

A perf + new-blocks release. Two design questions went through nexus 7-agent consensus votes before implementation: the per-character animation consolidation (86% approve, fold-in: cursor-first separate commit, deprecate not silently drop `charAppearDuration`, regression test) and the v0.7 priorities (epic synthesis from two discovery subagents).

### ⚠️ Deprecations

- **`animation.charAppearDuration`** still parsed + applied to the prompt fade-in and output-line fade-in, but no longer affects the typed-character reveal — that's now a single discrete clip-path animate per command. Marked `@deprecated` in src/types.ts; will be removed in v1.0.

### Performance

- **Per-character text reveal consolidated to one clip-path animate** (#63). The N per-character `<tspan opacity="0">...<animate.../></tspan>` for every command is replaced by a single `<clipPath>` whose width grows discretely as each character reveal time elapses. A typical 50-line SVG dropped from ~47 KB to ~15 KB (-68% raw). Animate-element count for a 5-line fixture: 80+ → <40 (locked by a new regression test).
- **Per-character cursor walk consolidated** (#63 pt 1, free win). N cursor `<animate>` elements → 1 with `calcMode="discrete"` + `values`/`keyTimes` arrays. Visually identical because the old per-char animates used `dur="1ms"` already.
- **Animation timing precision rounded to 1 decimal** (#65). `begin="2809.090909090909ms"` → `begin="2809.1ms"`.
- **TTL-based cache eviction** (#66). `flushCache` now prunes entries whose `fetchedAt` is older than `cacheTTL` before writing, so `.svg-terminal-cache.json` stays bounded over long-lived projects with shifting block configs.
- **`js-yaml` lazy-imported in `loadConfig`** (#64). Library consumers calling only `generate(parsedObject)` no longer trigger node's `require('js-yaml')` at module load time. `loadConfig` becomes async.

### New blocks (+8, registry 30 → 38)

**Animated** (each exercises the v0.6 `BlockResult.animation` primitive):
- `heartbeat` — 5-frame pulsing heart at 4 fps
- `spinning-gear` — 4-frame `|/-\` rotation at 6 fps
- `blinking-eyes` — 6-frame kaomoji that holds (◉◡◉) then blinks (-◡-)
- `countdown` — N..0..GO! launch sequence, plays once + freezes on GO

**Practical / new category:**
- `sparkline` — ASCII sparkline (`▁▂▄▇▆▅▃▂`) from a numeric series
- `bbs-login` — retro 1980s BBS welcome banner; pairs with `amber` / `green-phosphor`
- `build-badge` — terminal-style project status card with ✓/⚠/✗ glyphs
- `license-card` — boxed License / © year / holder display

### Tests

- 233 → 252 tests (+19). New: 11 for the new blocks, 2 for cache TTL pruning, 1 for the animate-count budget regression.

### Deferred (filed as separate issues for future rounds)

- #69 refactor frame-cycle to single `<text>` + content cycling (high effort, ~3-5 KB savings)
- #70 consolidate per-scroll `<animateTransform>` into one compound animate
- #71 SMIL animations don't respect `prefers-reduced-motion` (needs design vote on JS-in-SVG vs flag vs docs)
- #72 snapshot-file structuring helper (28 KB → ~7 KB by extracting common preamble)

## v0.6.0 — 2026-05-24

A large polish + capability release across four tracks: fun blocks, performance, developer experience, and a real accessibility story. 25 commits since v0.5.0.

### ⚠️ Breaking-ish changes

- **`effects.textGlow` defaults to `false`** (was `true`). The phosphor halo was washing every theme's text into the next line at default 14px. Now opt-in — set `effects.textGlow: true` in your config to keep it (recommended for `amber`, `green-phosphor`, `cyberpunk`). Win95 already had it off; nothing changes for that theme.
- **`GLOW_BLUR_VALUES` removed from `core/defaults.ts` exports.** The new composite glow filter is hardcoded inside `effects.ts` and no longer parameterized. Only matters if you imported the constant directly.

### New blocks (+13, registry 16 → 29 → 30)

Easter eggs: `vim-exit`, `sudo-sandwich`, `rm-rf`, `fork-bomb`, `kernel-panic`, `segfault`.
Personas: `whoami`, `last-login`, `finger`, `who`, `uptime`.
Visual: `matrix-rain` (single-frame Matrix screen with daily-stable PRNG), `cowsay` (with word-wrap).
Animated: `loading-spinner` (8-frame Braille cycle at 8 fps).

### New capabilities

- **Animated mascot primitive** — `BlockResult.animation = { frames, fps, loop }`. Frames cycle via SMIL `<animate>` with `calcMode="discrete"` so they swap instantly like a sprite. `loading-spinner` is the proof block; nyan/cow/baby can ride the same primitive later.
- **`<title>` + `<desc>` a11y track** — screen readers get the full final-frame content (commands prefixed with the prompt, output lines with color markup stripped), not just the 5-command `aria-label` summary. Opt out via `accessibility.describe: false`.
- **`registerTheme()`** API mirroring `registerBlock()`. Custom themes can register into the same Map the built-ins live in; resolves by name from YAML without inlining the whole Theme object.

### Performance

- **Composite glow filter** on `#scrollContainer` instead of `filter="url(#textGlow)"` on every `<text>`. Three Gaussian blur ops × 36 elements per render → three blur ops total. Glow-on dracula went 26 KB → 16.3 KB (-37%).
- **`.tt` CSS class** for `font-family`, `font-size`, `white-space:pre` — dropped from every `<text>` element to one rule. Glow-off SVGs went 26 KB → 22 KB.
- **Integer coordinate precision** by default — visual difference is zero at typical font sizes, attribute size drops.
- **Per-render cache hoists** — `buildColorMap` and `hasMarkup` no longer recomputed inside the line loop.
- **`--minify` CLI flag** — collapses inter-element whitespace for tightest output.

### Dynamic-block cache (`#36`)

- New `.svg-terminal-cache.json` next to your config (versioned `{ version: 1, entries }` envelope). Cache keys are `${blockName}:${sha256(config)}` so different `weather` cities don't collide.
- `BlockContext.useCache(key, getter)` for blocks to opt in. The 4 dynamic blocks (`weather`, `github-stats`, `quote`, `fun-fact`) now use it.
- CLI modes (last flag wins):
  - default: read fresh, fetch + write back stale
  - `--refresh-cache`: ignore existing, re-fetch all
  - `--frozen-cache`: serve only cached values, never fetch (true CI offline)
  - `--no-cache`: bypass entirely
- `svg-terminal cache check` subcommand for CI gates — exits 1 with a list of missing/stale entries.
- Atomic temp-rename writes, path-traversal guard on `cachePath`, graceful corrupt-JSON handling.

### Per-block config validation (`#35`)

- `Block.configSchema?: ZodTypeAny` for the strong path; `Block.allowedKeys?: readonly string[]` for the bridge path. All 30 built-in blocks now declare a strict zod schema — typos throw `BlockConfigError` at config-load time with the block name, entry index, and offending key.
- `--strict` CLI flag promotes any remaining unknown-key warnings to hard errors.

### DX & errors

- **`--watch` mode** — `svg-terminal generate --config foo.yml --watch` regenerates on save with 100ms debounce, serialized runs, SIGINT cleanup. Errors render inline without killing the loop.
- **Actionable errors** — `ConfigError` and `BlockConfigError` wrap YAML parse errors, zod validation, unknown theme/block names. CLI prints clean stderr without a stack trace.
- **Fixed `svg-terminal --version`** — was hardcoded to `0.4.0`; now injected by tsup at build time, tracks `package.json`.
- **HTTP User-Agent** now tracks the package version automatically.

### Themes & chrome

- 4 new themes: `amber`, `green-phosphor`, `cyberpunk`, `solarized-dark`, plus `win95` (auto-applies matching chrome).
- `theme: random` rotates deterministically by day-of-year.
- `nord` comment color bumped from `#4c566a` (1.7:1 contrast — invisible) to `#7c8ba8` (WCAG-readable).
- `titleFontFamily` separated from terminal monospace stack — title bars use system-UI sans-serif by default.
- Drop shadow tightened so it stops clipping at the viewBox edge.
- Scanline overlay constrained to the content area (no longer crosses the title bar).
- Win95 chrome polished: auto-shrunk title bar, real navy→light-blue caption gradient.
- Initial-scroll 4 px snap-up bug fixed.

### Docs & tooling

- New [`CONTRIBUTING.md`](./CONTRIBUTING.md) with block + theme recipes, and a PR template at `.github/PULL_REQUEST_TEMPLATE.md`.
- README documents all 8 themes (was 3), cache controls, accessibility, `--watch`.
- First-ever CI workflow (`.github/workflows/ci.yml`) — typecheck + lint + test + build + smoke generate on push and PR.
- GitHub Action now caches npm install and fails loudly on generate errors.
- ESLint v9 flat config — `npm run lint` works end-to-end.

### Tests

- 150 → 233 tests. New coverage: cache, per-block validation, a11y, animated frames, error paths, the 6 previously-untested blocks (htop, npm-install, profile, blog-post, national-day, systemctl), dynamic-block timeout fallback.
- SVG snapshot tests added for visual-regression detection.

### Process notes

Most of the architectural calls in this release were made via nexus-agents multi-agent consensus votes (higher-order strategy, 7 agents per question). Conditions raised by the architect / security / scope-steward / contrarian voters were folded into the implementations directly — they materially changed both the cache file layout (versioned envelope) and the animation API shape (`result.animation` not `result.frames.frames`).
