/**
 * Global `--strict` flag. Lives in its own module so both the block-config
 * validator (`src/index.ts`) and the SVG generator (`src/core/svg-generator.ts`,
 * over-tall animated band #124) can read it without a circular import.
 *
 * Set by the CLI's `--strict` via `setStrictBlockConfig()` (re-exported from
 * `src/index.ts` for back-compat). When active, soft warnings become hard
 * errors.
 */
let STRICT = false;

/** Enable/disable strict mode globally. */
export function setStrict(enabled: boolean): void {
  STRICT = enabled;
}

/** True when `--strict` is active — soft warnings become hard errors. */
export function isStrict(): boolean {
  return STRICT;
}
