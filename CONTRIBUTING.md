# Contributing to svg-terminal

Thanks for thinking about contributing — this project welcomes block authors, theme authors, and bug fixers. The library is small and the moving parts are well-documented in `CLAUDE.md`; read that first for the architectural tour.

## Local loop

```bash
npm ci                  # one-time install (Node 22+)
npm run dev             # tsup --watch — rebuild on change
npm test                # vitest
npm run typecheck       # tsc --noEmit
npm run lint            # eslint v9
npm run build           # production bundle into dist/
```

Run the built CLI against a sample config:

```bash
node dist/cli.js init                                # writes terminal.yml
node dist/cli.js generate --config terminal.yml      # writes terminal.svg
node dist/cli.js generate --config terminal.yml --watch    # rebuild on save
```

If you prefer your own file watcher, the built-in `--watch` is optional — `watchexec`, `entr`, or `nodemon` work just as well:

```bash
watchexec -w terminal.yml -- node dist/cli.js generate --config terminal.yml
```

CI runs typecheck + lint + test + build + a smoke generate on every PR (`.github/workflows/ci.yml`).

## Adding a new block

A block is a small TypeScript module that exports an object implementing the `Block` interface from `src/types.ts`.

1. Create `src/blocks/<name>.ts`. Copy `src/blocks/vim-exit.ts` for a no-config example, `src/blocks/custom.ts` for a config-driven static block, or `src/blocks/ascii-clock.ts` if your block needs `context.now` (e.g. a moon-phase or date-driven block).

2. **Declare a config contract.** Set `configSchema: z.object({...}).strict()` on your block. The renderer parses every user config through this schema before `render()` runs and throws `BlockConfigError` on failure — with the block name, the entry index, and the offending key formatted for the CLI. See `src/blocks/neofetch.ts` for a canonical example. Use `.strict()` so typos throw instead of being silently stripped.

   The universal entry-level keys (`command`, `color`, `typing`, `pause`) are handled by the renderer; don't redeclare them in your schema. If the block returns its own `command` from `render()`, the entry-level `command` overrides it — entry config wins over block-default.

   (The `allowedKeys: readonly string[]` field on the Block interface is back-compat only — it produces stderr warnings rather than throws, and no built-in uses it anymore. New blocks should use `configSchema`.)

3. If the block fetches from a network API, mark it `cacheable: true` so it participates in the cache machinery and `svg-terminal cache check`. Inside `render()`, call `context.useCache(key, () => fetchJson(...))` to opt into caching — see `src/blocks/quote.ts`.

4. Register the block: import it in `src/blocks/index.ts`, add it to the `registerBuiltinBlocks` call, and add it to the named re-exports.

5. Add a test in `src/blocks/__tests__/blocks.test.ts` covering the default render plus at least one config override.

6. Add a row to the Blocks table in `README.md`.

## Adding a new theme

1. Create `src/themes/<name>.ts` exporting a `Theme` with the full palette + three button colors. Copy `src/themes/nord.ts` as a starting point — every slot needs a value (no defaults).

   The required color slots (24 in `ThemeColors`, 3 in `buttons`):

   - **chrome:** `text`, `comment`, `background`, `titleBarBackground`, `titleBarText`, `prompt`, `cursor`
   - **standard ANSI:** `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`
   - **extended palette:** `orange`, `purple`, `pink`
   - **bright ANSI:** `brightRed`, `brightGreen`, `brightYellow`, `brightBlue`, `brightMagenta`, `brightCyan`, `brightWhite`, `brightBlack`
   - **macOS chrome buttons:** `close`, `minimize`, `maximize` (use the canonical `#ff5f57 / #ffbd2e / #28ca42` triad unless you have a strong reason — see solarized/dracula for thematic variations)

   **Contrast guidance:** `text` on `background` and `prompt` on `background` should clear WCAG AA (4.5:1 for normal text). Use a contrast checker; the gallery thumbnails will surface failures fast. `solarized-dark` deviates from canonical Solarized to clear AA — see `src/themes/solarized-dark.ts` for the rationale.

2. Register it: import in `src/themes/index.ts` and add to the `themes` registry.

3. Generate a sample to eyeball:

   ```bash
   npm run build && node dist/cli.js init
   # edit terminal.yml to set `theme: <name>`
   node dist/cli.js generate --config terminal.yml
   ```

4. Add a row to the Themes table in `README.md`.

### The win95 special case

`src/themes/win95.ts` triggers a chrome-style override in `src/core/config.ts` — when the theme is `win95`, `window.style` auto-switches to `win95` and the glow/scanline effects auto-disable. If you add a theme that needs its own chrome variant, follow the same pattern (extend `mergeConfig` to detect the theme and apply autoStyle/autoEffects).

## Style + correctness

- ESM only — use `.js` extensions in TypeScript imports (`from './types.js'`). `moduleResolution: 'bundler'` requires it.
- The SVG output must remain self-contained: no `<script>`, no external `<link>`, no external fonts beyond CSS `@media` queries. GitHub's SVG sandbox strips that anyway.
- The inline `@media (prefers-reduced-motion: reduce)` rule applies to CSS animations only. **CSS fade-ins (the prompt, output lines, animated-wrapper) honor it** — they migrated from SMIL to CSS `@keyframes fadeIn` in v0.10. **SMIL animations don't** — typed-character reveal, cursor walk, scroll, and frame-cycle animations keep running. Document this honestly in any new animated block's description, and point motion-sensitive users at `--static` for full stillness.
- Default to no comments. Add one when the WHY isn't obvious from the code — a hidden constraint, a subtle invariant, a workaround for a specific bug. Don't narrate what the code does.

## Reporting bugs / asking questions

Open an issue with the YAML config that reproduces it and the generated SVG (or a screenshot of how it renders in your README). Most rendering questions resolve faster with a minimal repro than a description.

## Conventions for PRs

- One logical change per PR. A new block, a perf fix, and a doc tweak are three PRs.
- Tests for new behavior. The existing suite is the safety net — keep it green.
- If you change SVG output structure: refresh the snapshots (`npm test -- -u`), and explain in the PR description what the visual delta is.
- Commit messages follow the repo style (conventional-commit-ish: `feat:`, `fix:`, `perf:`, `docs:`). The PR title becomes the squash-merge subject by default — make it count.
