# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` — bundle with tsup → `dist/` (ESM + `.d.ts`, targets node22).
- `npm run dev` — tsup watch mode.
- `npm test` — vitest, single run (434 tests at v1.1.0).
- `npm run test:watch` — vitest watch.
- `npm test -- src/core/__tests__/markup-parser.test.ts` — single test file.
- `npm test -- -t "fragment of test name"` — single test by name.
- `npm run typecheck` — `tsc --noEmit` (`strict`, plus `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`).
- `npm run lint` — ESLint v9 flat config over `src/`.
- `npm run generate` — `tsx src/cli.ts generate` against `./terminal.yml`.
- `npm run demo` — rebuild + regenerate the README hero SVG + 12-theme gallery (CI verifies the committed SVGs match the regen).
- `npm run demo:regen` — just the regen step (skips the rebuild). CI uses this after `build` to save ~9s.
- `node dist/cli.js generate --config terminal.yml --output terminal.svg [--static] [--minify] [--watch] [--no-cache | --refresh-cache | --frozen-cache] [--strict]` — built CLI surface.
- Node ≥ 22 (the CI workflow pins `22.22.3` so a Node patch bump can't silently change the SVG byte output).

## Architecture

The library converts a declarative YAML config into a single self-contained SVG (animation via SMIL `<animate>` / `<animateTransform>`; no script, no external assets, no external fonts). Output must work inside GitHub's SVG sandbox.

### Pipeline (entry point: `src/index.ts`)

1. `loadConfig(filePath)` (`src/core/config.ts`) reads YAML and runs it through `validateConfig` (`src/core/schema.ts`, zod). **Async** as of v0.7 (lazy-imports js-yaml so library consumers calling `generate(parsedObject)` don't trigger the YAML parser at module load). Throws `ConfigError` with file context on failure; the CLI surfaces it as a single multi-line message instead of a stack trace.
2. `generate(userConfig, options?)`:
   - Asserts `blocks.length >= 1` (programmatic guard — zod enforces this at load, but library callers can bypass).
   - `mergeConfig` resolves the theme, builds a `TerminalConfig` from defaults in `src/core/defaults.ts`. Theme-specific auto-config lives here: `win95` auto-picks `window.style: 'win95'`, shrinks `titleBarHeight` to 22, and disables glow/scanlines unless the user overrode them.
   - Per `BlockEntry`: look up the block, validate the entry's config against `Block.configSchema` (strict zod) — failure throws `BlockConfigError` with block name + entry index. Then call `block.render(context, entry.config)`. Result yields `command` (typed line), `lines` (output), optional `animation` (`{ frames, fps, loop }` for spinners/clocks/mascots), optional `typing`/`pause` preset names.
   - Output sequences fan out into a flat `Sequence[]` that `generateSvg` converts into an `AnimationFrame[]` timeline.
3. `generateStatic(userConfig, options?)` — skips the animation engine and renders all output lines at full opacity. Used for `--static`, accessibility fallbacks, and social-preview cards.

**`GenerateOptions`** (both functions): `configPath` (anchors cachePath resolution), `cacheMode` ('normal' | 'refresh' | 'frozen' | 'off'), `now` (override `context.now` for reproducible demos/tests).

### Blocks (`src/blocks/`)

48 built-in blocks, all implementing `Block` from `src/types.ts` with a strict zod `configSchema`. Registered into a `Map` by `src/blocks/registry.ts`; `registerBuiltinBlocks()` runs on import of `src/index.ts`. Third parties call `registerBlock({ name, configSchema, render })` before `generate`.

- **Dynamic blocks** (`weather`, `github-stats`, `github-languages`, `quote`, `fun-fact`) are marked `cacheable: true` and call `context.useCache(key, getter)` to participate in the on-disk cache (`.svg-terminal-cache.json`). They fall back to static defaults on fetch failure.
- **Animated blocks** (10 of the 48: `loading-spinner`, `heartbeat`, `spinning-gear`, `blinking-eyes`, `countdown`, `ascii-clock`, `progress-bar`, `bouncing-dot`, `dice-roll`, `jumping-jack`) populate `BlockResult.animation`. Frames may be **multi-line as of #69** — `jumping-jack` is the reference multi-line block; single-line frames remain the common case and render byte-identically to before (the renderer branches on frame height).
- The `Block.allowedKeys` legacy field exists for downstream third-party compat; every built-in uses `configSchema` instead.

### SVG rendering (`src/core/`)

- `svg-generator.ts` — entry to the SVG pipeline. Builds the frame timeline in `createAnimationFrames`: each command/output line is appended to a virtual buffer; once `buffer.length - bufferStart > maxVisibleLines`, emits a `scroll` frame. Scrolls are consolidated into ONE `<animateTransform>` on `#scrollContainer` spanning the full timeline (v0.10 — replaced N per-scroll elements; values/keyTimes encode the per-scroll begin/dur). Auto-height (`window.autoHeight`) measures sequence lines × line-height, clamped to `[minHeight, maxHeight]`. Emits `<title>` + `<desc>` as first children for screen-reader content (per `accessibility.describe`, default true). The SVG `<style>` block carries `@keyframes fadeIn` + `.fade-in` class, plus the existing `@media (prefers-reduced-motion: reduce)` rule that clamps CSS animations to 0.01ms.
- `line-renderer.ts` — per-line SVG.
  - Commands: ONE `<clipPath>` per command line whose `width` discretely steps as each character should appear (v0.7 consolidation — replaced N per-char `<tspan opacity="0"><animate/></tspan>`). The cursor walks via ONE `<animate attributeName="x" calcMode="discrete">` (v0.7) whose values are **lag-by-one** (cursor sits ON the just-emerged char, not after) and stays solid throughout typing (v0.8.1 fix — no mid-typing blink). Prompt fades in via CSS `.fade-in` class + per-element `style="animation-delay: ${startTime}ms"` (v0.10 — was SMIL `<animate opacity>`, migrated for `prefers-reduced-motion` compliance).
  - Output: CSS `.fade-in` class on the line `<g>` with per-element `style="animation-delay: …ms"`. v0.10 replaced the SMIL `<animate opacity>` + `<set>` pair with this CSS form so reduced-motion users see instant appearance instead of fade. Y position is `roundLineY(i * lineHeight)` (`.toFixed(1)`) — fractional y avoids the +1 px wobble that integer rounding produced on every 5th row (v0.9).
  - Animated blocks: N `<text>` siblings at the same y. v0.17 migrated cycling from per-frame SMIL `<animate attributeName="opacity">` to CSS `@keyframes frame-cycle-N` (one rule per unique frame count, emitted in the SVG `<style>` block by svg-generator.ts; deduplicated across same-N animated blocks). Each frame's text element carries `class="tt frame-cycle-N"` + inline `style="animation: frame-cycle-N {cycleMs}ms linear {i*frameDurMs}ms {loop ? 'infinite' : '1'}"`. The wrapping `<g>` carries the CSS `.fade-in` for its initial appearance (v0.10). Static `opacity="1"` on frame 0 / `"0"` on others is the fallback for SMIL-stripping renderers AND for `prefers-reduced-motion` users — in both cases the CSS animation doesn't drive opacity and the static attribute wins.
  - **Non-SMIL renderers**: every line group has no static `opacity="0"`, and clip-path rects have their FINAL width as the static attribute (not 0). SMIL-stripping renderers (OG scrapers, npm-readme, RSS) see the fully-rendered final frame. The `setHold` helper pins the SMIL start value via `<set>` for the typing reveal so the animation still plays where SMIL is honored.
- `cache.ts` — JSON cache file (`{ version: 1, entries: { ... } }`). `flushCache` prunes entries older than `cacheTTL` before writing. `resolveCachePath` guards against `..`-traversal AND symlink-escape — both sides are realpath'd before the `startsWith` check (v0.9, closed #84). `makeUseCache` throws on `ttl < 0`.
- `config.ts` — `loadConfig` (async), `mergeConfig`, `validateNames` (checks theme name + block names against live registries, rejects inline theme objects using the reserved name `random`).
- `errors.ts` — `ConfigError` + `BlockConfigError` with `formatted` field for stack-trace-free CLI rendering.
- `schema.ts` — top-level zod `UserConfigSchema`. `accessibility: false` users get a contextual hint to use `{ describe: false }`.
- `markup-parser.ts` — parses `[[fg:color]]…[[/fg]]`, `[[bold]]`, `[[dim]]` into `StyledSpan[]`. Colors resolve via the active theme palette.
- `box-generator.ts` — ASCII boxes (`single` / `double` / `rounded` / `heavy` / `dashed`). `resolveBoxWidth(config, context)` derives a column count from the terminal dimensions when no explicit width is set.
- `effects.ts` — SVG `<defs>` for textGlow filter (off by default since v0.6 — opt-in for CRT themes), scanline pattern, drop shadow, win95 caption gradient.
- `xml.ts` — `escapeXml`, `roundCoord` (integer precision by default), `roundTime` (1-decimal precision for animation timing), `getTextWidth` (monospace approximation: `0.6 * fontSize` per char).
- `http.ts` — `fetchWithTimeout` / `fetchJson` / `fetchText`. Never throws; returns `null` on any failure. User-Agent tracks the package version via tsup `define`.
- `defaults.ts` — every default config value, plus `TYPING_PRESETS` / `PAUSE_PRESETS` maps used by `resolveTyping` / `resolvePause`.

### Themes (`src/themes/`)

12 built-in themes (`dracula`, `nord`, `monokai`, `amber`, `green-phosphor`, `cyberpunk`, `solarized-dark`, `win95`, `catppuccin`, `tokyo-night`, `gruvbox`, `high-contrast`). Each exports a `Theme` with a full `ThemeColors` palette + 3 window-button colors. `resolveTheme` accepts a name string, a `Theme` object, or `'random'` (deterministic day-of-year rotation across `listThemes()`).

Inline themes (passed as a `theme:` object instead of a string name) go through a strict `InlineThemeSchema` in `src/core/schema.ts` that validates every color slot against `ColorRefSchema` (hex or palette name) — defense against the H2 XSS vector closed in v0.17.1.

`registerTheme()` adds a custom theme to a separate Map that shadows built-ins on name collision. Throws if the name is `'random'` (reserved for daily rotation). Inline theme objects using `name: 'random'` are also rejected at `loadConfig` time.

The `win95` theme is special-cased in `mergeConfig` to swap on its dedicated chrome (`window.style: 'win95'` + shrunk titleBarHeight + glow/scanlines off). The three CRT-aesthetic themes (`amber`, `green-phosphor`, `cyberpunk`) auto-enable `effects.vignette` via the same pattern (v0.14).

### Window styles

`WindowStyle = 'macos' | 'win95' | 'floating' | 'minimal' | 'none'`. `getTitleBarHeight` returns 0 for `floating`, `minimal`, and `none`. `win95` uses a separate `renderWin95TitleBar` (silver 3D border + navy→light-blue caption gradient + three classic window buttons).

### Animation primitive (`BlockResult.animation`)

Frame cycle. Each frame is a `string[]` of rows (`BlockAnimation.frames` is `string[][]`); rows are carried losslessly through the timeline (`Sequence.frames` / `AnimationFrame.frames` are `string[][]` — #69 nexus B-PIPELINE, no join/split round-trip). The renderer branches on frame height (`generateAnimatedOutputLine`, `src/core/line-renderer.ts`):
  - **Single-row frames** (the common case, all single-line animated blocks): N `<text class="tt frame-cycle-N">` siblings at the same y, each with inline `style="animation: frame-cycle-N …"`. This path is **byte-identical** to before #69 — the merge gate.
  - **Multi-row frames** (`jumping-jack`): each frame is a `<g class="tt frame-cycle-N">` wrapping H `<text>` rows at `y = row*lineHeight`; the opacity animation lives on the **group** (one per frame, not per row). `.tt` font-family/size/`white-space` inherit from the group to the rows. Ragged frames pad to the tallest with empty rows. The timeline reserves `H = max(frame rows)` buffer lines (`animationHeight()` in `svg-generator.ts`) so auto-height + scroll geometry account for the full band. A band taller than `maxVisibleLines` (only reachable with a too-small FIXED `window.height`, or an `autoHeight` `maxHeight` clamp — the default `autoHeight` sizes to fit) overflows the viewport clipPath; `createAnimationFrames` warns, or throws under `--strict` (#124). Mid-animation scrolling is not supported (the consolidated scroll transform assumes static lines).

Both paths share the per-N `@keyframes frame-cycle-N` rule (keyed on frame *count*, height-independent) emitted in the SVG `<style>` block. Static `opacity="1"` on frame 0 / `"0"` on others is the fallback for both SMIL-stripping renderers and `prefers-reduced-motion` users — see the line-renderer section above for the full migration narrative (v0.17). `loop: true` (default) → `animation-iteration-count: infinite`; `loop: false` → `1` (animation completes once then releases to the underlying opacity attribute = frame 0 visible). `fps` clamps to `[1, 30]` both at the runtime boundary and in each block's own configSchema (defense in depth).

### Cache primitive (`BlockContext.useCache`)

`useCache(key, getter, { ttl? })` for dynamic blocks. Modes: `normal` (read fresh, fetch + write on miss/stale), `refresh` (ignore existing entries), `frozen` (serve cached only — throws on miss, the CI offline path), `off` (bypass). Key convention: `${blockName}:${hashConfig(entryConfig)}` so different per-block configs don't collide. `cache check` CLI subcommand reports OK / STALE / MISS per cacheable entry with exit-code semantics for CI gates.

## Conventions

- ESM only (`"type": "module"`); use `.js` extensions in TypeScript imports because `moduleResolution: 'bundler'` emits ESM.
- Public types live in `src/types.ts`; re-exported via `export type *` from `src/index.ts`. New public surfaces (blocks, themes, helpers) get re-exported there so they appear in `dist/`.
- Tests live under `src/**/__tests__/**/*.test.ts` (vitest `include` glob). SVG snapshot tests live in `src/core/__tests__/__snapshots__/`.
- CLI is a single hand-rolled flag parser in `src/cli.ts` — no commander/yargs.
- `npm run demo` regenerates `examples/demo.svg` + `examples/demo-static.svg` + `examples/gallery/*.svg` from `examples/demo.yml` / `examples/gallery/_template.yml`. CI runs the regen and `git diff --exit-code` on `examples/` — PR authors update the demo if they touch rendering.
- Deprecated config fields (`animation.charAppearDuration` since v0.7, `animation.cursorBlinkCycle` since v0.8) stay in the schema for back-compat. Removal planned for v1.0.

## GitHub Action

`action.yml` defines a composite action (`williamzujkowski/svg-terminal@v1`) that installs the published npm package globally, runs `svg-terminal generate`, optionally commits the result. The action uses the published version, not the local source — behavior changes require an npm release.
