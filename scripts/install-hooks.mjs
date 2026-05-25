#!/usr/bin/env node
/**
 * Install a pre-commit git hook that regenerates the demo SVGs and fails the
 * commit if `examples/` ends up out of date. Avoids the prior loop where the
 * stale-examples check ran only at PR time, after ~90s of CI.
 *
 * Triggered by `npm install` via the `prepare` script. No-ops outside a git
 * checkout (npm tarball install, CI cache restore, etc.) so it doesn't
 * surprise anyone. Idempotent — won't overwrite a hand-customized hook.
 *
 * Bypass with `git commit --no-verify` if you genuinely need to skip the
 * regen (documented in CONTRIBUTING.md).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const HOOK_DIR = join(REPO, '.git', 'hooks');
const HOOK_PATH = join(HOOK_DIR, 'pre-commit');
const MARKER = '# svg-terminal pre-commit (managed by scripts/install-hooks.mjs)';

if (!existsSync(join(REPO, '.git'))) {
  // Not a git checkout — npm install from tarball, CI cache, etc.
  process.exit(0);
}

const HOOK_BODY = `#!/usr/bin/env bash
${MARKER}
# Re-run npm run demo:regen if the staged changes touch any file that could
# affect SVG output. If examples/ is out of date afterward, fail the commit
# with the regen command in the error message. Skip with --no-verify.
set -euo pipefail

CHANGED=$(git diff --cached --name-only)
if echo "$CHANGED" | grep -qE '^(src/(core|themes|blocks|cli\\.ts|index\\.ts|types\\.ts)|examples/(demo\\.yml|gallery/_template\\.yml|build-demos\\.mjs))'; then
  npm run demo:regen >/dev/null 2>&1 || { echo "::error::npm run demo:regen failed"; exit 1; }
  if ! git diff --quiet -- examples/; then
    echo ""
    echo "  \\033[31mexamples/ is out of date.\\033[0m"
    echo "  Run \\033[1mnpm run demo\\033[0m and stage the regenerated SVGs."
    echo "  (Skip this check with: git commit --no-verify)"
    echo ""
    git diff --stat -- examples/
    exit 1
  fi
fi
`;

mkdirSync(HOOK_DIR, { recursive: true });

if (existsSync(HOOK_PATH)) {
  const existing = readFileSync(HOOK_PATH, 'utf-8');
  if (!existing.includes(MARKER)) {
    // Hand-customized hook — don't clobber. Print a tip and exit.
    console.log('[svg-terminal] .git/hooks/pre-commit exists and is not managed by us; leaving alone.');
    process.exit(0);
  }
}

writeFileSync(HOOK_PATH, HOOK_BODY, 'utf-8');
chmodSync(HOOK_PATH, 0o755);
