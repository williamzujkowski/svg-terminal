# Changelog

## v1.2.1 — 2026-05-30 — documentation accuracy pass

Docs-only patch (no code or SVG changes). A full audit (3 fan-out reviewers cross-checking docs against the source) closed real gaps:

- **GitHub Action outputs documented.** The README's Action section listed inputs only — all five outputs (`svg-path`, `svg-bytes`, `svg-size`, `svg-sha256`, `svg-changed`) were undocumented, so `svg-changed` (the commit-gating signal) was undiscoverable. Added Inputs + Outputs tables and an example reading them.
- **CLI reference added.** `--minify`, `--strict`, `--timings`, `--explain`, `--cache-mode` were documented nowhere user-facing — added a full commands + flags reference.
- **Config keys documented.** `chrome`, `variables`, `maxDuration`, `scrollDuration`, `fetchTimeout`, `accessibilityLabel` were absent from the README — added a top-level-keys table. Documented the `[[bg:color]]` markup tag + raw-hex colors.
- **Stale counts fixed.** `package.json` description ("47 blocks, 12 themes" → 48 / 20, shown on npm); CONTRIBUTING `ThemeColors` slot count (24 → 25); PR-template test baseline (220+ → 464+); CLAUDE.md built-CLI line (added `--cache-mode`/`--timings`/`--explain`) and a passed "removal planned for v1.0" deprecation note.

Every documented key/flag/output was verified against `schema.ts` / `cli.ts` / `action.yml`.

## v1.2.0 — 2026-05-30 — OKLCH WCAG-AAA themes + legibility polish

Doubles down on legibility and color: **12 → 20 themes**, a sharper CRT glow, and WCAG fixes to existing palettes. 464 tests.

### Added

- **8 OKLCH WCAG-AAA themes**, a curated smattering from the 400+ scheme collection at [williamzujkowski.github.io/oklch-terminal-themes](https://williamzujkowski.github.io/oklch-terminal-themes/) — sharp, modern, and scanline-free by default. All clear **WCAG AAA body text (≥ 7:1)** with AA prompt/comment/title-bar (verified by test). Hex is baked into static theme files — no runtime dependency added.
  - `modus-vivendi` (neutral dark, 21:1), `oxocarbon` (IBM Carbon), `rose-pine`, `everforest`, `kanagawa`, `flexoki`, plus two **light** themes: `github-light` and `dayfox`.
  - The 8 modern themes default `effects.scanlines: false` (crisp/sharp) via a `MODERN_THEMES` set in `mergeConfig`, mirroring the win95/CRT special-cases — user-overridable with `effects.scanlines: true`.

### Changed

- **Sharper CRT glow (`#126`).** The opt-in `textGlow` filter used to blur a *copy of the text itself* (`stdDeviation 0.6` core) under a wide `stdDeviation 2` halo, softening every glyph — the "glow makes it hard to read" report. It's now a single tight halo (`1.4`) behind **razor-sharp, unblurred** text. The retro themes (`amber`, `green-phosphor`, `cyberpunk`) keep their phosphor aura but read crisp. (Glow is opt-in, so no default output changed.)

### Fixed

- **Sub-AA reds (`#101`)** found by a WCAG contrast audit — red marks errors/important output and must be readable: `gruvbox` (2.69:1 → 4.54, the worst offender), `nord`, `solarized-dark`, `monokai`. Hue-preserving lightness nudges; no other slot touched.

### Tests

- 464 passing (+26: per-theme AAA contrast, scanlines-off default + override, glow-off-by-default). Byte changes are limited to the 8 new gallery SVGs + the 4 red-fixed classics; no other theme drifted.

### Deferred (filed)

- `#127` — lift the remaining intentionally-dim `comment` colors to AA.
- `#128` — optional `text.fontWeight` (default 500) for extra legibility.

## v1.1.1 — 2026-05-30 — backlog cleanup (#123, #124, #125)

Patch release clearing the v1.1.0 follow-up backlog. No change to valid-config SVG output (demos byte-stable). 438 tests.

### Fixed

- **Flaky ReDoS-guard test (`#123`).** The intermittent `1 failed | …` seen under heavy CI load was a wall-clock budget assertion, not a concurrency race — a fan-out investigation confirmed the suite is well-isolated (vitest `forks` pool). The `stripMarkup` ReDoS guard runs ~150 ms idle but crossed the old 500 ms ceiling under CPU contention; the budget is now 2 s, which still catches a real regression (which runs to multiple seconds) while tolerating contention.
- **Over-tall animated band (`#124`).** A multi-line animated block (new in v1.1.0) taller than the visible area silently overflowed the viewport clip. `createAnimationFrames` now warns — or throws under `--strict` — when an animated band exceeds `maxVisibleLines`. `window.autoHeight` (the default) sizes to fit, so only a too-small fixed `height` (or an `autoHeight` `maxHeight` clamp) triggers it. The warning is numbers-only (log-safe). Picked via a nexus vote (100%, Option B); mid-animation scrolling remains unsupported by design.

### Changed

- **`--strict` flag extracted to `src/core/strict-mode.ts`** so the SVG generator can read it without a circular import; `setStrictBlockConfig` is re-exported from `src/index.ts` unchanged (public API stable).
- **Docs (`#125`):** CONTRIBUTING now notes the dev-toolchain Node floor (≥ 22.13, eslint 10's requirement); the published runtime floor stays `>=22.0.0`. Fixed a stale `eslint v9` reference.

## v1.1.0 — 2026-05-30 — multi-line animation + SSRF hardening + GA toolchain

First minor since the marketplace launch. Adds multi-line animation support (closes the long-standing #69 restriction), an SSRF guard on the public fetch surface, and moves the dev toolchain onto the current GA majors. 434 tests, byte-stable demos, lint + typecheck clean.

### Added

- **Multi-line animated frames (`#69`).** The animation primitive's frames can now span multiple rows — an ASCII mascot, a multi-row spinner — not just one line. `BlockAnimation.frames` was already `string[][]`; the rows are now carried losslessly through the internal timeline (the `\n`-join/split round-trip is gone) and the renderer branches on frame height:
  - **Single-row frames** (every existing animated block): unchanged, **byte-identical** output — the merge gate that keeps all demos + snapshots stable.
  - **Multi-row frames**: each frame is a `<g class="frame-cycle-N">` wrapping H `<text>` rows, opacity animation on the group; the timeline reserves `H = max(frame rows)` so auto-height + scroll geometry stay correct; ragged frames pad to the tallest; markup resolves per row. Same reduced-motion + SMIL-strip fallback contract (frame-0 group visible).
  - Design picked via a nexus consensus vote (85.7% supermajority, Option B + B-PIPELINE).
- **`jumping-jack` block** — a 3-row stick figure doing jumping jacks; the reference multi-line animated block. **48 blocks / 10 animated** now.

### Security

- **SSRF guard on `fetchWithTimeout` (`#113`, M3).** The public fetch surface now refuses non-`http(s)` schemes and literal private / loopback / link-local hosts (`127/8`, `10/8`, `172.16/12`, `192.168/16`, `169.254/16` incl. cloud metadata, `100.64/10`, `0/8`, broadcast, `::1`, `fe80::/10`, `fc00::/7`, IPv4-mapped equivalents, `localhost` incl. the trailing-dot form) before any network I/O. **Redirects are followed manually and re-validated on every hop** (capped at 5) so an allowed host can't 3xx into a blocked one. Defense-in-depth for third-party `registerBlock` consumers — a synchronous literal-host check; DNS rebinding is out of scope (documented). Found + hardened via an adversarial self-review (redirect re-validation, trailing-dot `localhost.`, and broadcast were review findings, fixed before release).

### Changed

- **Dev toolchain on GA majors:** TypeScript 5.9 → 6.0, ESLint 9 → 10 (with `@eslint/js` now an explicit devDep — eslint 10 no longer exposes it transitively), Vitest on 4.x. `tsconfig` gains `types: ["node"]` (TS6 stopped auto-including `@types/node` globals) and `ignoreDeprecations: "6.0"` (silences the `baseUrl` deprecation that tsup's DTS build trips; revisit at TS7). `@types/node` stays on `^22` to track the `engines` floor. GitHub Actions were already SHA-pinned to current majors (checkout v6, setup-node v6, codeql v3); Node stays on the 22 LTS line for byte-stability.
- **Docs:** README + CLAUDE.md updated for multi-line + the 48-block count; fixed a stale README reduced-motion caveat that still listed frame-cycle as SMIL (it's been CSS since v0.17).

### Tests

- 434 passing (+36: 11 multi-line, 25 SSRF). Lint + typecheck clean. Demos byte-stable (single-line animation output unchanged; new `jumping-jack` catalog SVG + a `47→48` count bump are the only example deltas).

### Known follow-ups

- `#124` — a multi-line block taller than the viewport clips instead of scrolling (LOW; autoHeight handles the common path).
- `#125` — `engines.node` floor is looser than eslint 10's dev requirement (dev-only).
- `#123` — an intermittent parallel-test flake observed once during validation.

## v1.0.0 — 2026-05-27 — GitHub Marketplace launch

First stable release. svg-terminal is now published on npm and listed on the GitHub Actions Marketplace. The v0.x line is feature-complete: 47 blocks, 12 themes, full SVG sandbox compatibility, defense-in-depth XSS / DoS / shell-injection guards, CodeQL clean.

### What's stable in v1

- **Library** (`svg-terminal` on npm) — `generate()`, `generateStatic()`, `loadConfig()`, `mergeConfig()`, `registerBlock()`, `registerTheme()`, `inspectCache()`, plus typed re-exports of every block + theme. Strict zod schemas at every config boundary. ESM-only, Node 22+.
- **CLI** — `svg-terminal generate / init / themes / blocks [<name>] / cache check`, with `--watch`, `--static`, `--minify`, `--strict`, `--no-cache | --refresh-cache | --frozen-cache`, `--timings`, `--explain`, `--force`.
- **GitHub Action** (`williamzujkowski/svg-terminal@v1`) — inputs: `config`, `output`, `cache-mode`, `static`, `minify`, `commit`, `commit-message`. Outputs: `svg-path`, `svg-bytes`, `svg-sha256`, `svg-changed`. SHA-pinned dependencies, env-passed inputs, `permissions: contents: read` by default (`contents: write` only when `commit: true`).

### Round-4 fixes (final pre-publish polish)

- **`svg-changed` semantic corrected** when no prior SVG exists. The output was emitting `true` on first run (since `prev_sha=""` differed from `new_sha`); now emits `false` so workflows can use `if: outputs.svg-changed == 'true'` to gate commits without firing on the bootstrap.
- **`git push` is explicit-refspec** (`HEAD:${GITHUB_REF_NAME}`) — the bare `git push` failed on the detached-HEAD checkout that `pull_request` triggers produce. Added a clear error message when `GITHUB_REF_NAME` is unset (i.e. the user wired `commit: true` to a `pull_request` event by mistake). Commit step also now skips when `svg-changed == 'false'` to avoid "nothing to commit" noise.
- **Library `console.log` removed from `resolveTheme`** — `theme: random` rotation no longer pollutes stdout for programmatic library consumers. Gated behind `SVG_TERMINAL_VERBOSE=1` for debug.
- **`package-lock.json` refreshed** to match `package.json` 1.0.0 (was drifted to 0.18.1).
- **CLAUDE.md test count** updated to 398 (was stale at 381).
- **CLAUDE.md "Animation primitive"** section corrected: described the pre-v0.17 SMIL implementation; now matches the CSS `@keyframes frame-cycle-N` migration.
- **CONTRIBUTING.md prefers-reduced-motion** caveat fixed: frame-cycle joined the CSS-honored set in v0.17, no longer a SMIL holdout.

### New: floating `v1` tag auto-mover

`.github/workflows/release.yml` runs on every `vN.M.P` tag push and force-moves the floating `v<major>` tag (`v1` today) to the matching point release. Marketplace consumers pinning `@v1` get patches without action on their part; prior to this the floating tag would have silently drifted. Supports `workflow_dispatch` for manual moves if a tag needs to be repointed.

### Tests

- 398 passing. Lint + typecheck clean. CodeQL `security-extended` clean. Demos byte-stable (TZ=UTC pinned in `examples/build-demos.mjs`).

### Backlog at v1.0.0

- `#113` SSRF guard on `fetchWithTimeout` — deferred (no current block accepts arbitrary URLs).
- Three "great ideas" filed across the session that didn't make v1: `#119` (this release closes it), language-stats coverage refinements, additional block ideas.

## v0.18.3 — 2026-05-26 — QA round 3 + CodeQL alerts

Closes the 3 open CodeQL alerts + 1 design issue from a third QA + security review.

### MED-1 — Polynomial ReDoS in `stripMarkup` (CodeQL `js/polynomial-redos`)

`src/core/markup-parser.ts:160` used `/\[\[[^\]]+\]\]/g` — unbounded backtrack class. Repro: 50,000 `[[` characters → ~10s of CPU. Reachable from any block output. Fix: bound the inner class to `{1,256}` (every legitimate markup tag is <20 chars). Worst case is now linear in input length; bench shows 50K-char hostile string in ~135ms vs 10s before.

### MED-2 — Path-local cycle guard (round-2 fix had a false-positive shape)

Round 2 introduced cycle detection in `scrubSecrets` + `canonicalize` via `WeakSet` that was `add`-only. That flagged legitimate DAG shares (same sub-object referenced from two paths) as cycles. Fix: convert to `Set` + `delete`-on-exit so only true ancestor cycles trip the guard. Real cycles still throw `"circular reference"` cleanly; DAG shares hash normally.

### LOW-1 — TOCTOU races in `init` + install-hooks (CodeQL `js/file-system-race` ×2)

`src/cli.ts:339` and `scripts/install-hooks.mjs:54` used `existsSync` → `writeFileSync`/`readFileSync` patterns that race between the check and the action. Fix:
- `init`: switch to `writeFileSync(path, content, { flag: 'wx' })` — atomic create-or-fail. `--force` still works via fallback to flag `w`.
- Hook installer: replace `existsSync` → `readFileSync` with try/`readFileSync`/`catch ENOENT` — same effect, no race window.

### Infrastructure

- **`workflow_dispatch`** added to `ci.yml` so CI can be manually re-triggered from the gh CLI / UI without needing a commit.

### Action

- Bumped pinned svg-terminal install: `svg-terminal@0.18.2` → `svg-terminal@0.18.3`.

### Tests

- 394 → 398 (+4): ReDoS bench (50K-char hostile string completes in <500ms), 3 cycle-guard regressions (DAG share doesn't false-positive in `hashConfig` or `scrubSecrets`; real ancestor cycle still throws).

### Verification of the deferred MAJORs

`typescript-eslint` v9 **still not GA** (latest published `8.60.0`; only `8.60.1-alpha` in canary). The two deferred Dependabot PRs from last session — `typescript@6` (`#112`) and `eslint@10` (`#121`) — remain blocked on this. Will revisit when ts-eslint v9 ships.

## v0.18.2 — 2026-05-26 — dep updates + QA-round-2 fixes

Closes 5 Dependabot PRs (`#108`, `#109`, `#110`, `#111`, `#116`) and 4 findings from a second QA + security review.

### Dependabot PRs merged

- **`actions/checkout`** v4.3.1 → v6.0.2 (SHA `de0fac2`) — `#108`
- **`actions/setup-node`** v4.4.0 → v6.4.0 (SHA `48b55a0`) — `#110` applied manually post-conflict
- **`github/codeql-action`** SHA bump within v3 (`fee9466` → `03e4368`) — `#109`
- **`@types/node`** 22.19.11 → 22.19.19 — `#111` (within-22-LTS patch)
- **`vitest` + `@vitest/coverage-v8`** 3.2.4 → 4.x — `#116`. Release notes confirmed no breakage in our test surface.

### Dependabot PRs explicitly deferred

- **`typescript`** 5.9.3 → 6.0.3 — `#112` closed: typescript-eslint v9 not GA yet (latest is `8.60.1-alpha`).
- **`eslint`** 9.x → 10.4.0 — `#121` closed: same blocker (peer-deps require ts-eslint v9). Also requires `engines.node: >=22.13.0` bump.

### QA round 2 findings shipped

- **Finding #1 — `fontFamily` escape on static SVG path.** `src/core/svg-generator.ts:668` emitted `${terminal.fontFamily}` in the `<style>` block without `escapeXml`. Animated path was escaped; this restores the defense-in-depth contract. Not currently exploitable (schema validator already rejects the dangerous characters).
- **Finding #2 — Cycle guards in `scrubSecrets` + `canonicalize`.** YAML anchors / programmatic cycles previously stack-overflowed both functions. `scrubSecrets` now replaces cycles with `'[CIRCULAR]'`; `hashConfig`'s `canonicalize` throws a clean `"config contains a circular reference"` error.
- **Finding #3 — Test coverage for `readCappedText`.** Three new cases: Content-Length over cap, mid-stream cap fire on a ReadableStream, under-cap pass-through.
- **Finding #6 — Wider `--explain` redaction.** `scrubSecrets` now wraps the entire explain payload (was only `block.config`). `userConfig.variables`, `merged.window`, `merged.text` also covered.

### Action

- Bumped pinned svg-terminal install: `svg-terminal@0.18.1` → `svg-terminal@0.18.2`.

### Tests

- 386 → 394 (+8): 3 for size cap, 2 for URL log scrub (`?query`, `userinfo`), 2 for `scrubSecrets` cycle, 1 for `hashConfig` cycle.

## v0.18.1 — 2026-05-26 — security hardening

Closes `#114` — the L1/L2/L3/L4 hardening cluster from the v0.17.0 security audit. All defense-in-depth; no known exploit but each is best-practice for the marketplace publish.

### L1 — Pin actions to SHAs

All references to `actions/checkout@v4`, `actions/setup-node@v4`, and `github/codeql-action/{init,analyze}@v3` across `ci.yml`, `codeql.yml`, and `action.yml` now use immutable SHA pins. Mutable major tags are a supply-chain risk; SHAs are immutable. Dependabot's `github-actions` ecosystem (configured in v0.17.1) keeps them auto-bumped.

### L2 — Cache file mode 0o600

`writeFileSync` for `.svg-terminal-cache.json` now passes `mode: 0o600` (owner read/write only). Shared CI runners with permissive umasks no longer leave cache contents world-readable. Cache today only holds public API responses, but mode 0o600 future-proofs against blocks that might cache auth tokens.

### L3 — URL query strings scrubbed from logs

`fetchWithTimeout` / `fetchJson` / `fetchText` warn-log paths now go through a `safeUrlForLog()` helper that strips `?query` + `#fragment` before logging. Defense against future third-party blocks that might embed credentials in query strings.

### L4 — Secret scrubbing in `--explain`

`svg-terminal generate --explain` now redacts values whose key names match a conservative regex (`/token|secret|password|api[-_]?key|auth|credential|bearer|webhook[-_]?url/i`) in the JSON dump. The CLI's --explain output ends up in CI logs and shared stack traces; this prevents future blocks that take credential config from leaking those credentials. Helper exported from `src/core/cli-helpers.ts` for library consumers building their own debug surfaces.

### Action

- Bumped pinned svg-terminal version in `action.yml` install: `svg-terminal@0.17.1` → `svg-terminal@0.18.1`.

### Tests

- 381 → 386 (+5): cache file mode 0o600 (L2); URL log scrub on HTTP failure (L3); secret scrub recursion + nested objects + primitives (L4 × 3).

## v0.18.0 — 2026-05-26

Marketplace prep. Closes `#115`, `#117`, `#118`, `#120` from the v0.17.0 audit.

### Documentation

- **Block catalog (`#118`).** New `examples/blocks/` directory: one SVG per block (all 47), auto-generated by `npm run demo` from `listBlocks()`, with an auto-generated `examples/blocks/README.md` index. Users browsing for "show me what `cowsay` actually renders" get a direct visual instead of guessing from a one-line description. CI's `git diff --exit-code` keeps the catalog in sync — a future 48th block writes its own catalog row + SVG for free.
- **README badges (`#115`).** Added CI status, CodeQL status, npm version, npm downloads, Node 22+, MIT license badges above the hero.
- **README "Try in 60 seconds" lede.** A 3-line code block + the GitHub Action snippet now sit directly under the hero SVG, before the feature bullet list. Marketplace visitors no longer scroll past 280 lines of library docs to find the action example.
- **`inspectCache(userConfig, configPath)` API signature corrected** in README (was missing the first arg).
- **Soft-marketing residue trimmed** ("fancy", "iconic", "authentic") flagged by the docs audit.
- **CLAUDE.md drift cleanup (`#120`).** Test count 281 → 381, theme count 8 → 12, Node CI pin 22.19.0 → 22.22.3, added `npm run demo:regen` script, added inline-theme validation note, added CRT-vignette auto-enable note.

### GitHub Action (`#117`)

- **Pinned svg-terminal version in `action.yml`** (`npm install -g svg-terminal@0.17.1`). Users pinning the action by SHA / tag now get reproducible behavior instead of whatever floats on the npm registry. Bumped each action release to match the published npm version.
- **New outputs:** `svg-bytes` (integer string), `svg-sha256` (hex digest), `svg-changed` (`true` | `false` — did the SVG differ from the previously-committed version?). Enables workflows like "only commit on change" without a separate `git diff` step.

### Tests

- 381 → 381 (no new tests; this release is docs + infra changes).

## v0.17.1 — 2026-05-26 — **SECURITY**

⚠️ **All users should upgrade.** This release closes 3 HIGH-severity XSS vectors and 1 MEDIUM shell-injection vector in the GitHub Action, plus 1 DoS mitigation. Found by an internal security audit (nexus-driven multi-stream review).

### HIGH — XSS in generated SVG (H1, H2, H3)

The renderer interpolated user-controllable `color`, `fontFamily`, `titleFontFamily`, and inline-theme `colors.*` values into SVG `fill=`, `font-family=`, and `<style>` blocks without validation or escaping. Confirmed-reproducible attacks:

- **H1**: `color: '" onmouseover="alert(1)" x="'` on a block entry → event handler in rendered SVG
- **H2**: same shape via an inline theme's `colors.text`
- **H3**: `terminal.fontFamily: 'monospace; } </style><script>alert(1)</script>'` → `<script>` tag in output

GitHub's user-content domain strips event handlers from served SVGs, but **downstream consumers** (npm-readme, raw GH via custom domain, static-site generators that embed the action output) often don't. Fix shipped with defense-in-depth:

- **Schema validation layer** (`src/core/schema.ts`): new `ColorRefSchema` (hex `#abc`/`#aabbcc` or theme palette name only) and `FontFamilySchema` (conservative char allowlist). Inline themes now go through a `strict` zod schema with every color slot validated. Loaders (`loadConfig` / `validateConfig`) reject attacks at config-load time with a clear error message.
- **Emit-site escaping** (`src/core/svg-generator.ts`, `src/core/line-renderer.ts`): every user-controllable color / font-family interpolation into an SVG attribute or `<style>` block now goes through `escapeXml()`. Library consumers who construct a `UserConfig` programmatically and bypass `loadConfig` still get the second layer of protection.

### MEDIUM — Shell injection in GitHub Action (M1)

`action.yml` interpolated `${{ inputs.config }}`, `${{ inputs.output }}`, and `${{ inputs.commit-message }}` directly into `bash` `run:` blocks. A consumer who piped a PR title or commit-message env var through these inputs could execute arbitrary shell on the runner. Fixed by passing all user inputs via `env:` (`INPUT_CONFIG`, `INPUT_OUTPUT`, `INPUT_COMMIT_MESSAGE`) so the values never enter shell template expansion.

### MEDIUM — Response-size DoS (M4)

`fetchJson` / `fetchText` buffered the full upstream response into memory. A hostile or compromised upstream API (wttr.in, dummyjson.com, api.github.com) could OOM the CI runner by returning a multi-GB body inside our `fetchTimeout` window. New 1 MiB cap (`MAX_RESPONSE_BYTES` in `src/core/http.ts`): the body is streamed and aborted mid-read if the cap is hit. Respects `Content-Length` for the fast path.

### Hardening

- `.github/workflows/ci.yml` now declares `permissions: contents: read` (least privilege).
- New `SECURITY.md` documents the disclosure flow, scope, and security model.

### Tests

- 378 → 381 (+3): three security regressions — H1, H2, H3 each have a test that constructs the attack and asserts `loadConfig` throws with a clear error message. The pre-existing snapshot suite catches emit-site changes.

### Migration

**No config changes required for legitimate use.** If you were passing color names like `"red"` or hex strings like `"#abc"`, those continue to work. If you were passing arbitrary CSS color expressions (e.g. `"rgb(255 0 0)"`), they now fail validation — use a hex string or theme palette name instead.

## v0.17.0 — 2026-05-25

Closes `#69` (the last backlog issue — refactor frame animation from per-frame SMIL opacity-cycle to CSS `@keyframes`). Driven by a deliberate nexus consensus process: 2 parallel research subagents (OSS landscape + creative-approaches) plus a bench → 7-voter consensus_vote (100% approval, 5-2 majority for Option D over C).

### Frame cycle migration

- **Per-frame SMIL `<animate attributeName="opacity">` replaced with CSS `@keyframes frame-cycle-N`.** One rule per unique frame count (deduplicated across same-N blocks). Each frame text element gets `class="tt frame-cycle-N"` + inline `style="animation: frame-cycle-N {cycleMs}ms linear {i*frameDurMs}ms infinite"`. The `animation-delay` positions each frame's visible window at its slot of the cycle.

- **Reduced-motion compliance for animated blocks (the headline win).** v0.10 migrated FADE-INS to CSS so `@media (prefers-reduced-motion: reduce)` could honor them; frame cycling was the last SMIL holdout. Now the same `@media` block clamps frame-cycle animations too. Under reduced-motion the CSS animation completes near-instantly with `fill-mode: none` (default), so the static `opacity` attribute applies — frame 0 visible (`"1"`), rest invisible (`"0"`). Identical to the SMIL-stripped fallback.

- **DOM `<animate>` element count drops ~75%** on the pathological all-9-spinners config (141 → 36). Renderer parse-time benefit even though gzip was already absorbing the byte cost.

### Bench (v0.16.3 → v0.17.0)

| Scenario | Raw bytes | Gzip bytes | `<animate>` count |
|---|---|---|---|
| ascii-clock alone | 5186 → 5588 | 1912 → 2120 | 6 → 4 |
| Realistic 5-block (1 spinner + 1 heart) | 20800 → 19714 (-5%) | 3570 → 3746 | 33 → 20 |
| All-9-spinners (pathological) | 69687 → 38235 (-45%) | 5034 → 4384 | 141 → 36 (-75%) |

The bench informed the design vote: gzipped wire cost is largely unchanged for typical configs (gzip absorbed the SMIL repetition fine). The motivation was a11y motion-compliance, not bytes. Voters explicitly classified the byte-driven Option C (sprite-sheet via translate) as **over-engineering** for the actual user impact and chose the smaller-blast-radius Option D (~50-100 LOC vs ~150-250 for C).

### Tests

- 375 → 378 (+3): 8 new frame-cycle tests (rewrote 5 existing for the new shape; added 3 for keyframe dedup + no-emit-when-empty + frame-0 static fallback).

### CONTRIBUTING.md note

The `prefers-reduced-motion` caveat in CONTRIBUTING.md says SMIL animations don't honor it (typing reveal, cursor walk, scroll). That's still true. Now updated: **frame cycle joins fade-ins as the second SMIL → CSS migration; only typing-reveal, cursor-walk, and scroll remain SMIL-driven.** Pair with `--static` for full stillness.

### Backlog cleared

`#69` was the last item on the backlog. Every concrete issue from this session is closed except deferred-by-vote partial coverage (`#71` full SMIL reduced-motion — Option 3 dual-render rejected by vote in v0.10 for the same 1.4-1.6x bloat reason that just got applied to `#69`).

## v0.16.3 — 2026-05-25

Closes `#97` and `#98` — two schema/generator drift bugs filed by external users in the same session.

### Bug fixes

- **`accessibilityLabel` config option now honored (`#97`).** The field was declared in `UserConfigSchema` and `--strict` accepted it, but both the animated and static generator paths in `src/core/svg-generator.ts` always emitted an auto-generated label. Now `config.accessibilityLabel` wins on both paths; auto-generation is the fallback when unset. Also added to `TerminalConfig` so it surfaces in the merged config.
- **`chrome.titleFontFamily` added to the zod schema (`#98`).** The field was declared in the `ChromeConfig` TS interface (and used by the default config), but `ChromeSchema` rejected it as `unrecognized_keys` under `--strict`. Schema and type now agree. Also added to the `KNOWN_KEYS` typo-suggestion map.

### Tests

- 370 → 375 (+5): four for `#97` (animated + static, label set + unset) and one for `#98` (the field roundtrips through `loadConfig` without `--strict` rejection).

## v0.16.2 — 2026-05-25

Closes `#72` and `#95`. Test infra only.

### Tests

- **Per-scenario snapshot files** at `src/core/__tests__/__snapshots__/svg/{name}.svg` (one file per scenario) instead of a monolithic 20 KB `.snap`. When a rendering change breaks 2 of 4 snapshots, `git status` shows 2 individual file changes you can `git diff` directly — instead of grepping a wall of XML. Uses vitest's `toMatchFileSnapshot`. CONTRIBUTING.md updated to point at the new location.
- No test count change (refactor, not new coverage).

## v0.16.1 — 2026-05-25

Closes `#85` (opt-in output-line width pinning) and `#91` full (box-drawing chars stripped from screen-reader `<desc>`).

### Output

- **`BlockResult.pinWidth?: boolean`** — opt-in for output lines. When set, the output line text element emits `textLength` + `lengthAdjust="spacingAndGlyphs"`, pinning the rendered width to our `CHAR_WIDTH_RATIO * fontSize` math regardless of the viewer's monospace fallback. Use for custom blocks whose layout depends on precise alignment of plain-ASCII content. Skipped automatically when the line contains markup (parseMarkup → multiple tspans, where outer textLength would distort tspan spacing). No built-in opts in — the field is for custom-block authors with alignment-sensitive ASCII output. (Closes `#85`.)

### Accessibility (closes #91 full)

- **`<desc>` strips leading/trailing box-drawing chars from mixed content lines.** v0.11.0 already elided lines composed entirely of box-drawing glyphs (`╔═══╗` style); v0.16.1 extends that to ALSO strip the box framing from content rows. `║ Hello, world ║` becomes `Hello, world` in the screen-reader `<desc>` — no more `║` being pronounced as the letter "L" by VoiceOver. Both the animated and static path use the new `stripBoxFraming` helper.

### Tests

- 367 → 370 (+3): pinWidth emits on plain ASCII, skips on markup, default off; box-framing stripped from `<desc>` content lines.

## v0.16.0 — 2026-05-25

Block UX. Closes `#104` (quote/fortune redundancy) and `#105` (4-persona overlap).

### `whoami` default render (closes #105) — ⚠️ visible behavior change

The default render is now a terse 1-line `uid=1000(dev) gid=1000(dev) groups=...` format — what real `whoami -a` (or `id` on Linux) outputs. The previous multi-line existential-bullets render is still available via `verbose: true`. Frees the persona-bullet pattern for `finger`/`who`/`last-login` where it belongs, and gives `whoami` a visually distinct silhouette at gallery thumbnail size.

```yaml
# Default (new): uid=1000(dev) gid=1000(dev) groups=1000(dev),100(users),...
- block: whoami
  config:
    user: alice
    uid: 1337
    gid: 1337
    groups: ['1337(alice)', 'sudo', 'docker']

# Verbose (preserves prior render):
- block: whoami
  config:
    verbose: true
    bullets: ['…']
```

**Migration:** if your existing config relied on the old multi-line render, add `verbose: true` to keep it.

### `fortune` pool expansion + `quote` offline degrade (closes #104)

- **`fortune` default pool went from 3 entries to ~28 dev classics** with author attribution (Knuth, Torvalds, Kernighan, Fowler, Beck, etc.). Daily rotation now actually feels random over a typical user's exposure window. Custom `fortunes:` config still wins; no migration needed.
- **`quote` block offline fallback** rotates through `fortune`'s `DEFAULT_FORTUNES` pool by day-of-time rather than serving the same Steve Jobs quote forever. Users who set `fallback:` and `fallbackAuthor:` keep that explicit override.
- New `DEFAULT_FORTUNES` exported from `src/blocks/fortune.ts` so library consumers can reuse the pool.

### Tests

- 364 → 367 (+3): whoami default + verbose mode, quote fallback rotation, quote user-fallback override.

## v0.15.0 — 2026-05-25

Closes `#102` (cache hit/miss/fallback visibility) and `#103` (closed wontfix after benching).

### Cache visibility (closes #102)

- **New `GenerateOptions.onCacheEvent` callback** + new `BlockResult.fallback` field. The cache layer now emits `'hit' | 'miss' | 'refreshed'` events per `useCache()` invocation, and the generate loop emits `'fallback'` events once per block whose render returned `result.fallback === true`. Previously the user had no signal at the block boundary that, say, `--frozen-cache` served stale data or the network call silently failed and the block returned defaults.
- **CLI auto-prints a one-line cache summary** to stderr after every render when any dynamic block participated: `[svg-terminal cache] hit 1 miss 1 fallback 1 [github-languages]`. Hits in green, fallbacks in yellow. Quiet when no cacheable blocks were involved (the default).
- **All 5 cacheable blocks updated** to set `result.fallback = true` when serving defaults: `weather` (no location, or fetch returned nothing); `github-stats` (fetch returned null); `quote` (fetch returned null); `fun-fact` (fetch returned null); `github-languages` (no username, fetch returned null, or aggregate empty).

### Perf (closes #103 wontfix)

- **Benched 50-block `vim-exit` config at 6.44 ms per generate.** Schema parsing is microseconds of that total — memoization would shave nothing visible. Closed `#103` as wontfix; reopen if a real config hits the 50ms+ range.

### Public API additions

- `GenerateOptions.onCacheEvent?: (event: 'hit' | 'miss' | 'refreshed' | 'fallback', key: string) => void`
- `BlockResult.fallback?: boolean`
- `CacheEventType` exported type
- Both fully backwards-compat (purely additive optional fields).

### Tests

- 359 → 364 (+5): one per cacheable block asserting `result.fallback === true` on the fallback path.

## v0.14.2 — 2026-05-25

Closes `#101` — two new CLI instrumentation modes.

### CLI

- **`--timings`**: prints per-phase wall-clock breakdown to stderr after every render — `load: Nms / generate: Nms / write: Nms / total: Nms`. Useful for spotting "is loadConfig slow?" vs "is generate slow?" vs "is the cache layer hot?". Pairs naturally with `--watch` to see the iteration cost over time.
- **`--explain`**: emits a JSON dump of the resolved config (theme, window, text, effects, maxDuration) plus the block list with cacheable status — to stderr so it doesn't interleave with the SVG if piped. Runs the full generate path; doesn't skip writing. Useful for debugging "why is my animation getting cut off at maxDuration", "is this theme actually applied", "did this block get registered".

Both flags are added to the known-flags set (so the unknown-flag warning from v0.13.0 still works cleanly) and documented in `--help`.

### Tests

- 359 → 359 (no new tests — the additions are CLI-side instrumentation with stderr output; live-verified end-to-end).

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
