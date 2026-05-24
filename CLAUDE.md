# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` — bundle with tsup → `dist/` (ESM + d.ts, targets node22)
- `npm run dev` — tsup watch mode
- `npm test` — run vitest once
- `npm run test:watch` — vitest watch
- `npm test -- src/core/__tests__/markup-parser.test.ts` — run a single test file
- `npm test -- -t "fragment of test name"` — run a single test by name
- `npm run typecheck` — `tsc --noEmit` (strict, plus `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`)
- `npm run lint` — ESLint over `src/`
- `npm run generate` — `tsx src/cli.ts generate` (runs the CLI from source against `terminal.yml`)
- `node dist/cli.js generate --config terminal.yml --output terminal.svg [--static]` — run the built CLI
- Requires Node ≥ 22.

## Architecture

The library converts a declarative YAML/JSON config into a single self-contained animated SVG (no JS in output, animation via SMIL `<animate>` / `<animateTransform>`). Output must work inside GitHub's SVG sandbox.

### Pipeline (entry point: `src/index.ts`)

1. `loadConfig` (`src/core/config.ts`) reads YAML and runs it through `validateConfig` (`src/core/schema.ts`, zod).
2. `generate(userConfig)`:
   - `mergeConfig` resolves the theme and merges `UserConfig` with defaults from `src/core/defaults.ts` into a full `TerminalConfig`. Theme-specific auto-config lives here (e.g. `win95` auto-picks `window.style: 'win95'` and disables glow/scanlines unless the user overrode them).
   - For each `BlockEntry`, look up the registered `Block` and call `block.render(context, entry.config)`. The result yields a `command` (the line being "typed") and `lines` (output). These become a flat list of `Sequence`s (`{ type: 'command' | 'output', content, pause, ... }`).
   - `generateSvg(sequences, config)` (`src/core/svg-generator.ts`) walks the sequences, builds an `AnimationFrame[]` timeline (typing animation, scroll, fade-in), and emits the SVG string.
3. `generateStatic(userConfig)` skips the animation engine and renders all output lines at full opacity via `generateStaticSvg` — used for accessibility, print, and social previews.

### Blocks (`src/blocks/`)

Blocks are pluggable content modules implementing `Block` from `src/types.ts`. They are registered in a `Map` by `src/blocks/registry.ts`. `registerBuiltinBlocks()` runs on import of `src/index.ts`, so any caller of `generate` automatically has the built-ins available. Third parties call `registerBlock({ name, render })` before `generate`. Block `render` can be sync or async; dynamic blocks (`weather`, `github-stats`, `quote`, `fun-fact`) `fetch` at build time using `src/core/http.ts` (`fetchWithTimeout`, respects `config.fetchTimeout`) and must fall back gracefully when the API fails.

### SVG rendering (`src/core/`)

- `svg-generator.ts` — main entry. Builds the frame timeline in `createAnimationFrames`: each command/output line is appended to a virtual buffer; once `buffer.length - bufferStart > maxVisibleLines`, it emits a `scroll` frame (via `<animateTransform>` on the `#scrollContainer` group) before the next `add-command` / `add-output` frame. Auto-height (`window.autoHeight`) overrides `window.height` by measuring sequence lines × line-height, clamped to `[minHeight, maxHeight]`.
- `line-renderer.ts` — turns `AnimationFrame[]` into per-line SVG: command lines get character-by-character typing animation plus a blinking cursor; output lines fade in. Uses the markup parser to emit `<tspan>`s.
- `markup-parser.ts` — parses `[[fg:color]]…[[/fg]]`, `[[bold]]`, `[[dim]]` into `StyledSpan[]`. Color names resolve via the active theme palette.
- `box-generator.ts` — ASCII box rendering (`single`, `double`, `rounded`, `heavy`, `dashed`).
- `effects.ts` — SVG `<defs>` for the phosphor glow filter, drop shadow, and scanline pattern.
- `xml.ts` — `escapeXml`, `roundCoord` (coordinates are rounded for smaller SVG output), and the monospace `getTextWidth` (uses `CHAR_WIDTH_RATIO = 0.6 * fontSize`).
- `defaults.ts` — all default config values and `TYPING_PRESETS` / `PAUSE_PRESETS` maps that `resolveTyping` / `resolvePause` look up by string name.

### Themes (`src/themes/`)

Themes export a `Theme` with a `ThemeColors` palette and three window-button colors. `resolveTheme` accepts a name, a `Theme` object, or `'random'` (deterministic day-of-year rotation across `THEME_NAMES`). The `win95` theme is special-cased in `mergeConfig` to swap on the matching window chrome.

### Window styles

`WindowStyle = 'macos' | 'win95' | 'floating' | 'minimal' | 'none'`. `floating`/`minimal`/`none` collapse the title bar to height 0 in `getTitleBarHeight`; `win95` uses a separate `renderWin95TitleBar` with hardcoded silver/blue chrome instead of the theme palette.

## Conventions

- ESM only (`"type": "module"`); always use `.js` extensions in TypeScript imports (e.g. `from './types.js'`) because we target `moduleResolution: 'bundler'` emitting ESM.
- All public types live in `src/types.ts`; re-exported from `src/index.ts` via `export type *`. When adding a public surface (block, theme, helper), wire it through `src/index.ts` so it appears in the published `dist/` API.
- Tests live under `src/**/__tests__/**/*.test.ts` (vitest `include` glob).
- The CLI is a single file (`src/cli.ts`) with hand-rolled flag parsing — no commander/yargs dependency.

## GitHub Action

`action.yml` defines a composite action (`williamzujkowski/svg-terminal@v1`) that installs the published npm package globally, runs `svg-terminal generate`, and optionally commits the result. The action uses the published version, not the local source — bumping behavior requires a release.
