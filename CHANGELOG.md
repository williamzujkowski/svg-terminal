# Changelog

## v0.14.1 — 2026-05-25

Single-feature patch release. Closes `#100` — discoverability win for the 47-block library without grepping the source.

### CLI

- **`svg-terminal blocks <name>`** prints a single block's config schema. Walks the zod schema via `formatZodType` (handles string/number/boolean/enum/array/optional/nullable; unwraps `.optional()` automatically; renders enums as `"a" | "b" | "c"`). Cacheable blocks are tagged. Unknown block names print an actionable error and exit 1.
- **`svg-terminal blocks`** (unfiltered) now tags cacheable blocks with `*` so users can tell at a glance which need network/cache management.
- Help text + README updated to mention the new `[<name>]` argument.

### Tests

- 353 → 359 (+6): `formatZodType` covers primitive/enum/array/optional/nullable cases + null/undefined fallback; `isZodOptional` distinguishes wrapped vs bare.

## v0.14.0 — 2026-05-25

Visual polish + correctness + DX. 7 backlog items closed (`#86`, `#87`, `#90`, `#94`, `#96`, `#106`, `#107`).

### Effects

- **`effects.vignette` (closes #94):** subtle radial darkening from center to corners (0 → 25% black at the corner). New `EffectsConfig.vignette` field defaulting to `false`. Auto-enabled for the three CRT-aesthetic themes (`amber`, `green-phosphor`, `cyberpunk`) via the same `mergeConfig` pattern that auto-applies the win95 chrome. Mimics a real CRT's center-hot phosphor falloff; lifts those gallery thumbnails out of papercraft-flat without changing the standard themes.

### Themes

- **`monokai` titleBarText quieted (closes #87)** from body color (`#f8f8f2`) to canonical comment color (`#75715e`). At gallery-thumbnail size monokai was visually indistinguishable from dracula (same macOS chrome + warm-dark bg + similar accent palette); the dim title is the cheapest place to differentiate.
- **`cyberpunk` titleBarText switched (closes #86)** from hot-pink `#ff0080` to body color `#e0e0ff`. The saturated pink-on-violet boundary passed WCAG AA (5.24:1) but visually buzzed (perceptual vibration). Body color reads as part of the chrome instead of a glow accent.

### Blocks (correctness)

- **`htop` task count + load are now configurable (closes #106).** Previously hardcoded as `processes.length + 10` total tasks and `processes.length` running — both lied when users customized the process list. New `tasks` and `load` config fields; running count now derives from the table state (`p.state === 'R'`) so internally consistent.
- **`national-day` truncation honors `width` (closes #107).** Was hardcoded at 32/38 chars regardless of the box width config; a user setting `width: 100` to fit a long name still got truncated. Now derives from `width - 14` (name) and `width - 8` (desc) with a 10-char floor.

### Chrome

- **win95 caption buttons are now 16×14, not 16×16 (closes #90).** Authentic Windows 95 caption-button glyphs were slightly wider than tall. Refactored from a single `btnSize` to separate `btnW`/`btnH`; height is `round(width × 14/16)`.

### DX

- **Pre-commit git hook (closes #96)** installed by `npm install` (via the `prepare` script). When staged changes touch rendering-affecting paths (`src/core/`, `src/themes/`, `src/blocks/`, `src/cli.ts`, etc.), the hook runs `npm run demo:regen` and refuses the commit if `examples/` ends up out of date. Saves the round-trip of finding out at PR time after ~90 s of CI. Bypass with `git commit --no-verify`. Hook is idempotent + won't clobber a hand-customized hook (script lives at `scripts/install-hooks.mjs`).

### Tests

- 353 → 353 (no new tests this release). All snapshot fixtures refreshed for the vignette + monokai + cyberpunk + win95 button changes.

### Filed for follow-up (carried)

- `#69` (multi-spinner DOM bloat), `#71` (full SMIL reduced-motion), `#72`/`#95` (snapshot split), `#85` (output textLength), `#91` (full ARIA box-drawing), `#100` (CLI block schema), `#101` (CLI timings/explain), `#102` (cache hit/miss visibility), `#103` (schema memoization), `#104` (quote/fortune redundancy), `#105` (4-persona overlap).

## v0.13.0 — 2026-05-25

CLI ergonomics + correctness + DX release. Round 5 discovery (3 parallel agents — CLI / blocks / perf) surfaced 18 findings; 9 shipped here, 8 filed for future rounds (`#100`–`#107`).

### CLI ergonomics

- **`init` refuses to overwrite an existing `terminal.yml`** without `--force`. The prior silent clobber was the worst class of CLI bug — losing 30 minutes of YAML tuning to a stray ↑-enter on the entry-point command was unforgivable.
- **Watch mode prints `[HH:MM:SS]` timestamps + render duration** (`Generated terminal.svg (13.1 KB, 87ms)`) so users can see *when* each re-render happened and how long it took. Previously the log line was indistinguishable across re-renders.
- **Unknown `--flag` tokens now warn** instead of silently being ignored. A typo like `--no-chache` previously fell back to normal cache mode while the user thought they bypassed it.
- **Help text grouped** into Commands / Generate options / Cache modes (mutually exclusive) / Init options / Global. `--force` and `--cache-mode <m>` documented. Examples expanded.
- **`init` template fixes:** added `win95` to the style options comment (was missing); added a commented-out `loading-spinner` block to show the library's signature animation feature in the starter file.

### Blocks (correctness)

- **`weather` block: consolidated space-encoding.** The standalone `weather` block encoded spaces in location names as `_` while the `motd`-embedded `fetchWeatherSummary` used `~` — two adjacent functions in the same file, each with a comment claiming the OTHER was wrong. Both go through a new `encodeWttrLocation` helper that standardizes on `+` (wttr.in's most-documented variant). Multi-word locations (`"San Francisco"`) now hit the same URL regardless of which entrypoint serves the data.
- **`spinning-gear` glyph fix:** frame 3 was `─` (U+2500 BOX DRAWING) mixed with ASCII `|/\` — the box-drawing char is visibly wider in most monospace fonts, making the animation read as flicker rather than rotation. Now pure ASCII `|/-\`.

### SVG output

- **Dropped dead `id="line-N"` attributes** from every output `<g>`. They were emitted by `line-renderer.ts` but referenced nowhere (the typing reveal uses `cmdrev-N` clipPaths, fade-ins use the CSS class, scroll targets `#scrollContainer`). Saves ~315 bytes per typical hero scene; ~13% of gallery SVG payload at the tail. `lineIndex` parameter dropped from the two output-line generators since it had no other use.

### CI / DX

- **Split `npm run demo`** into `demo` (build + regen) and `demo:regen` (regen only). CI's "verify demo SVGs are up to date" step now uses `demo:regen` since `build` already ran — saves ~9 s per CI run (the prior step rebuilt tsup + DTS redundantly).

### Tests

- **310 → 353 (+43).** Extracted `formatModeTag`, `humanAge`, `minifySvg`, `resolveCacheMode`, `parseFlags` from `src/cli.ts` into `src/core/cli-helpers.ts` so they can be unit-tested without spawning a subprocess. The helpers' ~45 LOC of logic is now 100% covered; the entry script `src/cli.ts` itself stays unmeasured (CLI never runs in unit tests). Overall project coverage 89.99% → 90.15%. New `src/core/__tests__/cli-helpers.test.ts` with comprehensive edge cases (`resolveCacheMode` conflict detection across all combinations, `minifySvg` whitespace boundaries with `white-space: pre` guards, etc.). `@vitest/coverage-v8` added to devDependencies.

### Filed for future rounds (round-5 discovery)

- `#100` (CLI: inspect single block's schema), `#101` (CLI: `--timings`/`--explain`), `#102` (cache hit/miss visibility), `#103` (zod schema memoization for `--watch`), `#104` (quote/fortune redundancy), `#105` (4-persona overlap), `#106` (htop hardcoded task count), `#107` (national-day truncation).

## v0.12.0 — 2026-05-25

New block + new theme. Closes `#92` (github-languages block) and `#93` (high-contrast theme — first new theme aimed at WCAG AAA / accessibility-first use).

### New block: `github-languages` (closes #92)

A cacheable block that fetches a GitHub user's public repos via `https://api.github.com/users/{username}/repos?per_page=100`, aggregates the `language` field (skipping null/no-language repos), and renders the top N as horizontal percentage bars with cycling theme colors. The single most-requested GitHub profile README widget — finally bundled. Implementation reuses the existing `useCache` + `fetchJson` pattern from `github-stats` / `quote` / `fun-fact`.

**Config:**
- `username` (required) — GitHub username
- `top` (1–10, default 5) — how many languages to display
- `barWidth` (5–40, default 20) — width of the unicode `█░` bar in chars
- `fallback` — optional explicit `[{name, percent}, …]` for offline / no-username use
- `command` — the displayed prompt

Cache key uses `{ username, top }` only — `barWidth` and `fallback` are cosmetic and don't affect the fetched payload, so re-rendering with different bar widths shares the cache hit. Static fallback (TypeScript / JavaScript / Rust / Go) is sliced by `top` so `top: 2` still works offline.

This is the 5th cacheable block (joins `weather`, `github-stats`, `quote`, `fun-fact`). Total built-in blocks: 46 → 47.

### New theme: `high-contrast` (closes #93)

WCAG AAA pure-black-on-white palette. Pure white text on pure black = 21:1; every accent color clears 7:1 against the black background (yellow 19.6:1, cyan 16.7:1, green 15.3:1, magenta 9.0:1, lifted blue 8.4:1, lifted red 5.7:1 [AA only — pure red would be too dim]). Useful for users with low vision, screen-readability needs, slide projections, or high-glare environments. Not aesthetic competition for the standard themes — a deliberately blunt accessibility-first instrument.

Total themes: 11 → 12.

### Tests

- 301 → 310 (+9): github-languages block (6 unit tests covering static fallback, custom bar widths, top counts, schema rejection), plus 3 cache/fetch tests (live fetch aggregation with null-language skipping, fetch failure → static fallback, fetch failure → user fallback).

### Filed for follow-up (carried)

- `#69` (multi-spinner DOM bloat), `#71` (full SMIL reduced-motion), `#85` (output textLength), `#86` (cyberpunk contrast), `#87` (dracula/monokai similarity), `#90` (win95 button aspect), `#91` (full ARIA box-drawing), `#94` (CRT vignette), `#95` (snapshot file split), `#96` (pre-commit hook).

## v0.11.0 — 2026-05-25

Themes + DX release. 3 community themes (catppuccin, tokyo-night, gruvbox), typo hints with Levenshtein suggestions, `<desc>` payload elision, shadow filter region widened, per-theme gallery title bars. Round 3 discovery surfaced 8 findings — 5 shipped here, 5 filed for future rounds.

### Themes (+3, total 11)

- **catppuccin** (Mocha) — the canonical pastel dark theme. Surface2 comment-color lifted slightly to clear WCAG AA against Base.
- **tokyo-night** (storm) — popular Vim/Neovim companion. Same comment-color lift as catppuccin for AA.
- **gruvbox** (dark medium) — retro warm contrast.

All three pass WCAG AA for `text` and `prompt` on their backgrounds; gallery thumbnails added.

### Config UX

- **Levenshtein typo hints (closes round-3 finding #5).** Schema now `.strict()` at every level. Unknown keys at top-level OR in nested objects (`window`, `terminal`, `effects`, `animation`, `chrome`, `accessibility`) now throw `ConfigError` with a "did you mean…?" suggestion drawn from the known keys at that path. Levenshtein-≤2 matching, capped at distance 1 for short (≤3 char) inputs to avoid `fpo → foo` overreach. The prior behavior was silent skip — users typing `winodw:` or `fontsize:` would set defaults and think the field was broken.
- **Hardcoded `KNOWN_KEYS` map** in `src/core/config.ts` rather than runtime zod introspection — zod's `_def` shape isn't stable across versions, so we trade one edit per schema change for stability.

### Output payload

- **`<desc>` elides pure box-drawing lines (partial #91).** Lines composed entirely of Unicode box-drawing glyphs (`U+2500–U+257F` + whitespace) carry zero semantic value for screen readers AND inflate the payload (~600 bytes per ASCII box × 8 gallery files = ~5 KB). Now stripped at emit time. ARIA pronunciation guidance (the OTHER half of #91) remains open for a separate design call.
- **Shadow filter region widened (closes #88).** `x="-5%" y="-5%" width="110%" height="115%"` → `x="-8%" y="-8%" width="116%" height="120%"`. At saturated effects the prior bounds clipped the side shadow by ~2 px.

### Gallery

- **Per-theme title bar (closes #89).** `user@svg-terminal:~` → `user@<theme>:~` for each gallery thumbnail. The thumbnail now labels itself.

### Library exports

- **Completed the theme re-exports** at `src/index.ts`. Only `dracula, nord, monokai` were named-exported (despite 8 themes existing); now all 11 are re-exported (`amber, greenPhosphor, cyberpunk, solarizedDark, win95, catppuccin, tokyoNight, gruvbox` added). Pure addition — library consumers can now `import { gruvbox } from 'svg-terminal'` instead of going through `getTheme('gruvbox')`.

### Tests

- 296 → 301 (+5): Levenshtein typo hint (3 cases — toplevel, nested, no-match); `<desc>` box-drawing elision (2 cases — strip / keep-when-mixed).

### Filed for future rounds (round-3 discovery)

- `#92` `github-languages` block (top-N language % bars — staple profile widget).
- `#93` high-contrast / WCAG AAA accessibility theme.
- `#94` subtle radial vignette effect for CRT themes.
- `#95` snapshot file split (subsumes `#72`).
- `#96` pre-commit hook gating `examples/` regen.

## v0.10.0 — 2026-05-25

Accessibility + perf release. Closes `#70` (perf) and `#71` (a11y prefers-reduced-motion, partial — fade-ins only). Docs friction from a user-journey audit fixed in the same batch.

### Accessibility (closes #71, partial)

- **CSS fade-ins honor `prefers-reduced-motion`.** Output line + prompt + animated-wrapper fade-ins migrated from SMIL `<animate opacity>` (which has no CSS-controllable equivalent) to a CSS `@keyframes fadeIn` rule with per-element `style="animation-delay: ${startTime}ms"`. The existing `@media (prefers-reduced-motion: reduce)` block in the SVG `<style>` already clamps CSS animation-duration to 0.01ms, so reduced-motion users now see instant appearance instead of fades — without losing the staggered narrative.

  **Partial coverage by design.** The typing reveal, cursor walk, scroll, and frame cycle remain SMIL-driven and continue to ignore reduced-motion — those animations are inherently SMIL (no CSS equivalent for animating a clip-path width, cursor x position, scroll transform, or frame opacity cycle). Motion-sensitive users should pair with `--static` for full stillness. README + CONTRIBUTING both call out the boundary explicitly.

  Decision via 7-agent nexus consensus vote: 100% approval, majority for Option 5 (CSS fade-ins) over Option 3 (dual-render). Option 3's full-coverage win was judged not worth the ~1.4–1.6x SVG size doubling and doubled snapshot-test surface.

### Perf (closes #70)

- **Consolidated per-scroll `<animateTransform>` into one.** Each scroll used to emit its own `<animateTransform>` with its own `begin` and `dur` (N elements for N scrolls). Now one `<animateTransform>` with `values` + `keyTimes` encodes the entire scroll trajectory. For a typical 30-scroll config, drops ~30 elements to 1; ~2 KB savings.

- **Net SVG size DOWN** despite adding 9 fade-in elements per scene: removing the SMIL `<animate>` + `<set>` pairs (~150 bytes each) and replacing with `class="fade-in" style="animation-delay: …"` (~50 bytes each) saves ~100 bytes per fade-in. Demo SVG now ~20.5 KB (was ~22 KB).

### Docs (user-journey audit)

- **Node 22+ requirement now above the fold** in README (was buried in `engines`).
- **Complete `.github/workflows/refresh-svg.yml` example** with cron schedule, `permissions: contents: write`, checkout, and `commit: true`. The previous snippet showed only the `uses:` step in isolation.
- **`registerBlock` documented** with TSDoc at `src/index.ts` listing the `Block` interface fields and override-on-collision semantics.
- **CONTRIBUTING.md theme section now inlines the 24 + 3 color slot list** so authors don't have to spelunk into `src/types.ts`. Adds WCAG AA contrast guidance.
- **CONTRIBUTING.md block-author section** points at `ascii-clock.ts` as the `context.now` reference (was vim-exit only). Documents the entry-config `command` override.
- **Programmatic API snippet** shows the ESM async wrapper to avoid the top-level-await trap for new TS users. Documents `inspectCache`.

### Tests

- 291 → 296 (+5): scroll consolidation regression; CSS fade-in emit + class + delay (4 cases).

### Filed for follow-up (carried)

- `#69` (multi-spinner DOM bloat) — still deferred; marginal savings, medium complexity.
- `#72` (snapshot helper) — still deferred; DX-only.
- `#85`–`#91` — 7 UX-audit follow-ups carried.

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
