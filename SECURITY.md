# Security Policy

## Reporting a Vulnerability

Please report security issues privately via GitHub's **[Report a vulnerability](https://github.com/williamzujkowski/svg-terminal/security/advisories/new)** flow — not via public issue. We will acknowledge within 5 days.

If GitHub Security Advisories aren't available to you, email security disclosures to `williamzujkowski@gmail.com` with subject line `[svg-terminal security]`.

## Scope

This project produces inline SVGs that are typically embedded in GitHub READMEs via `<img src=…>` and processed by the GitHub Actions Marketplace flow. In-scope vulnerabilities include:

- **XSS / script execution in the generated SVG** — script tags, event handlers, CSS injection, SVG `<foreignObject>` abuse, or any other vector that achieves code execution in a viewer's browser when the SVG is rendered. (GitHub's user-content domain strips many SVG attack vectors, but downstream consumers — npm-readme renderer, raw GitHub via custom domain, static-site generators consuming the action output — often don't.)
- **Shell injection in the GitHub Action** — user-controlled inputs (`config`, `output`, `commit-message`, `cache-mode`) flowing into shell-interpolated commands inside `action.yml`.
- **Filesystem escape** — path-traversal via `cachePath`, `configPath`, or any other file path the library writes to. (We already wrap path resolution in `fs.realpathSync` for the cache path — see [#84](https://github.com/williamzujkowski/svg-terminal/issues/84).)
- **Denial of service** — memory exhaustion on the CI runner from a hostile upstream API response (mitigated since v0.17.1 by a 1 MiB response cap on `fetchJson` / `fetchText`); CPU pinning via runaway regex; cache-file unbounded growth.
- **Supply chain** — typosquatting in the published `svg-terminal` npm package, or in the GitHub Action's transitive dependencies.

## Not in scope

- Vulnerabilities in user-supplied custom blocks (third-party `registerBlock()` consumers). The library treats custom blocks as trusted; users registering them are responsible for the block's input validation.
- Attacks requiring the attacker to already have write access to the YAML config file. (If they have that, they can run any CLI they like — the threat model assumes the YAML author is trusted.)
- Issues in dependencies that we have no reasonable path to mitigate (we'll forward to upstream).

## Security model summary

- **Config validation:** Every user-supplied field is validated by a `strict` zod schema in `src/core/schema.ts`. Color values are constrained to a hex pattern or theme palette name; font-family values are constrained to a conservative character allowlist. The schema rejects fields the type doesn't declare. Validation happens at `loadConfig` time (called by the CLI) and by the public `validateConfig()` export.
- **Output escaping:** Every user-controllable string that lands in the generated SVG goes through `escapeXml()` at the emit site — both in text content and in attribute values. This is the second layer of defense for library consumers who construct a `UserConfig` programmatically and bypass `loadConfig` / `validateConfig`.
- **Cache path:** `resolveCachePath()` resolves both the configured base and the target through `fs.realpathSync` before checking the traversal guard, so a symlinked config dir can't smuggle the cache file out of its apparent parent.
- **HTTP fetches:** Bounded by `fetchTimeout` (default 10s) AND by a 1 MiB response-size cap that aborts the stream mid-read. Hostile / compromised upstreams can't OOM CI runners.
- **GitHub Action inputs:** Passed through env vars (`INPUT_CONFIG`, `INPUT_OUTPUT`, `INPUT_COMMIT_MESSAGE`, etc.) so they never go through GitHub Actions template expansion into shell commands.
- **CI permissions:** `.github/workflows/ci.yml` declares `permissions: contents: read` — least privilege.

## Disclosed vulnerabilities

See [GitHub Security Advisories](https://github.com/williamzujkowski/svg-terminal/security/advisories) for the public list. Brief history:

- **v0.17.1 (2026-05-26)** — Closed 3 confirmed XSS vectors and 1 shell-injection vector found by an internal security audit. See [v0.17.1 release notes](https://github.com/williamzujkowski/svg-terminal/releases/tag/v0.17.1).
- **v0.9.0 (2026-05-25)** — Closed `#84`: cachePath traversal guard bypassed by symlinked configDir.
