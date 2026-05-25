# Changelog

## v0.9.0 — 2026-05-25

UX polish release driven by a frontend-design audit + backlog rerank. Substantial visible changes to rendered output: SVGs now render meaningful content even when SMIL is stripped (social-card scrapers, npm-readme, RSS); three themes had concrete bugs fixed; the heart in `heartbeat` no longer reads as a punctuation glitch; line spacing no longer wobbles every 5th row. The `cache.ts` symlink-escape (`#84`) is closed.

### SVG output

- **Non-SMIL fallback (`#85`).** Every line group used to carry `opacity="0"` and every typing clip-rect used to carry `width="0"`, with SMIL `<animate>` elements driving them to visible. Renderers that strip SMIL (OG/social-card scrapers, npm-readme cards, some RSS readers, screenshot tools) saw a blank navy rectangle as the first frame — only the title bar showed. The fix: drop the initial `opacity="0"` / `width="0"` so the element's underlying value is the final state (visible); a new `<set>` element pins the start value until the existing `<animate>` takes over. SMIL viewers see exactly the same animation as before; non-SMIL viewers see the fully-rendered final frame. New helper `setHold(attr, value, untilMs)` in `src/core/line-renderer.ts`. Applies to: prompt opacity, typed-text clip-rect width, output-line group opacity, animated-frame-cycle line group opacity.
- **Line-spacing wobble fixed.** With default `lineHeight = 14 × 1.8 = 25.2`, `roundCoord(i × 25.2)` produced gap pattern `25, 25, 26, 25, 25, 25, 25, 26, …` — a visible +1 px jog every 5 rows on dense neofetch output. Now y emits fractional (`.toFixed(1)`) → uniform 25.2 gaps. Fractional y values are anti-aliased fine by every SVG renderer.
- **Static SVG drops dead `.scanline-overlay` class.** The static path emitted the overlay with a CSS class that has no matching rule (the keyframes only exist on the animated path). Class attribute now omitted on the static path; the rect still renders as a static scanline overlay, just without the dead reference.

### Themes

- **Amber + green-phosphor: restored canonical macOS triad.** Both themes' "traffic light" buttons were monochromatic (amber: three oranges; green-phosphor: three greens), which broke the red/yellow/green metaphor — viewers couldn't tell they were window controls. Both now use the canonical `#ff5f57` / `#ffbd2e` / `#28ca42`.
- **Solarized-dark: prompt + comment colors lifted for WCAG AA.** Canonical Solarized's `prompt: #268bd2` was 4.08:1 on `background: #002b36` (fails AA, requires 4.5:1); `comment: #586e75` was 2.79:1 (well below AA). Lifted to `prompt: #4eb3e8` and `comment: #7d9499` — both clear AA while staying in the Solarized hue family. Note: this deviates from Ethan Schoonover's canonical palette; the deviation is a deliberate accessibility tradeoff.

### Blocks

- **`heartbeat` off-frame uses spaces, not `'.'`.** The 2 "off" frames in the beat cycle rendered as `' . '` — read as a punctuation glitch, not as the heart's quiet phase. Now `'   '` (3 spaces) so the heart simply disappears in the gaps. Width-preserving (still 3 chars) so the surrounding label doesn't shift.

### Security

- **`cachePath` symlink-escape closed (`#84`).** `resolveCachePath` was string-based: a symlinked configDir pointing outside its apparent parent could be used to write the cache file outside the intended tree while passing the textual `startsWith` guard. Both paths now go through `fs.realpathSync` before comparison; symlinked configDirs are unwrapped to their real target. TOCTOU caveat documented in the JSDoc — the threat model is narrow (attacker needs write access to the config dir to swap symlinks).

### Tests

- 284 → 291 (+7): symlink-escape regression for `#84`; SMIL-stripped fallback (4 tests: line groups, clip-rect width, prompt text, animated-output frame 0); line-position fractional-y rounding; first-sequence command has no setHold.

### Filed for follow-up

7 issues filed from the UX audit (`#85`–`#91`): output-line textLength pinning, cyberpunk titleBarText buzz, dracula/monokai thumbnail similarity, shadow filter region tightness, generic gallery title bar, win95 caption-button aspect, `<desc>` box-drawing chars for screen readers. None block this release.

## v0.8.2 — 2026-05-25

Single-issue fix release.

### Fix

- **Typed command no longer overlaps the prompt.** The animated path emits the prompt and the typed text as two separate `<text>` elements, with the typed one positioned at `x = getTextWidth(prompt) = prompt.length × fontSize × 0.6`. If the viewer's browser falls back to a monospace font whose advance is wider than that 0.6 ratio (some default `monospace` aliases on Firefox/Safari), the prompt's rendered glyphs extend past `x=promptWidth` and visually overlap the first characters of the typed command.

  Fix: both elements now carry `textLength` + `lengthAdjust="spacingAndGlyphs"` so the rendered width is pinned to the computed math regardless of which monospace font the viewer's browser picks. Glyphs scale ~5% in the worst case — well under the perceptual floor for typing animation. The cursor walk and clip-path reveal math is unchanged; it was always self-consistent, the only inconsistent piece was the prompt's free-floating render width.

### Tests

- 281 → 284 (+3): assert prompt + typed-text carry `textLength`; assert empty command emits only the prompt's `textLength`.

## v0.8.1 — 2026-05-25

Polish release surfaced by a three-agent full-repo review (docs accuracy / source QA / repo hygiene). One issue filed for follow-up (`#84`, symlinked-configDir cachePath escape — real but rare + has TOCTOU caveats); 15 findings fixed inline.

### Fixes

- **Inline theme `{ name: 'random' }` now rejected at load time.** Was bypassing the `registerTheme` reserved-name guard (only the string form was checked) and silently shadowing the daily-rotation behavior.
- **`--watch` handles SIGTERM, not just SIGINT.** Process managers (docker, systemctl, kill) send SIGTERM; the watcher used to leak until the kernel reaped it.
- **`generate()` / `generateStatic()` throw on empty `blocks`.** zod enforces this at config-load, but library consumers building a UserConfig in code could bypass it and get an empty SVG.

### Packaging

- **npm publish no longer ships source maps.** `files` field tightened to `["dist/**/*.js", "dist/**/*.d.ts", ...]`. Drops ~296 KB of `.map` files (~70% of the prior `dist/` payload).
- **`package.json` description rewritten** — dropped subjective words, named the actual numbers (46 blocks / 8 themes / zero runtime deps in the output).
- **Keywords refreshed** for v0.8 feature surface (smil, blocks, themes, yaml, cache, static-site, accessibility).
- **`.gitignore` covers user-facing CLI defaults** (`terminal.yml`, `terminal.svg`) and the cache file (`.svg-terminal-cache.json`) so local exploratory runs don't get tracked.
- **CI Node version pinned to `22.19.0`** — was floating on `22`, a minor bump could silently change the generated SVG bytes (the demo-verification step diffs byte output).

### GitHub Action

- New inputs: `cache-mode` (normal | refresh | frozen | off), `static`, `minify`. The previous README's `args: --frozen-cache` example didn't actually work — the action only accepted `config`, `output`, `commit`. Now it does.
- Description rewritten (drop "beautiful").

### Docs

- **CONTRIBUTING.md** — test-count claim was stale (~220 → actual 276+). Block-author guidance no longer recommends the `allowedKeys` "bridge path" as one of two equal options (every built-in uses `configSchema`; the bridge is back-compat only).
- **CHANGELOG.md** — v0.8 test-count math was wrong (`+21 this release` → actual `+24`).
- **README.md** — intro rewritten to drop subjective words; `Custom Blocks` example now shows the `configSchema` pattern; `Programmatic API` section documents the `GenerateOptions` surface (configPath, cacheMode, now); GitHub Action snippet uses the real inputs.
- **CLAUDE.md** — rewritten end-to-end for v0.8.1 (was last updated at v0.5). Documents the cache primitive, animation primitive, accessibility track, deprecated fields, and current pipeline.
- **GitHub v0.8.0 release notes** updated in place to fix the test-count math.

### Tests

- 276 → 281 (+5): inline-random-theme reject, single-char cursor edge, empty-command cursor, programmatic empty-blocks reject (×2).

### Filed for follow-up

- `#84` cachePath traversal guard is string-based; symlinked configDir can resolve outside the apparent tree. Real but rare; `fs.realpath()` has TOCTOU caveats. Documented as a known limitation.

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

- 252 → 276 tests (+24 in v0.8; +43 cumulative from v0.6's 233).

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
