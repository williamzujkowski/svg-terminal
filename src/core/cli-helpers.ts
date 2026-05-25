/**
 * Pure helpers extracted from `src/cli.ts` so they can be unit-tested without
 * spawning a child process. The CLI itself stays hand-rolled (no
 * commander/yargs — deliberate per CLAUDE.md) and re-imports these.
 *
 * Everything in this file MUST be a pure function. No I/O, no `process.exit`,
 * no `console.log` — the CLI is the only place that talks to stdout/stderr.
 */

import type { CacheMode } from './cache.js';

/**
 * Format the "(static, minified, cache:frozen)" suffix on the generate log
 * line. Returns an empty string when nothing notable is set so the caller can
 * unconditionally concatenate.
 */
export function formatModeTag(opts: {
  isStatic: boolean;
  minify: boolean;
  cacheMode: CacheMode;
}): string {
  const parts = [
    opts.isStatic && 'static',
    opts.minify && 'minified',
    opts.cacheMode !== 'normal' && `cache:${opts.cacheMode}`,
  ].filter(Boolean);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

/**
 * Human-readable age string for the `cache check` output. Input is in seconds
 * (matching `CacheInspectionResult.ageSeconds` on the inspector). Negative
 * values clamp to 0 to avoid "-3s" weirdness from clock skew between writer
 * and reader.
 */
export function humanAge(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0s';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

/**
 * Collapse inter-element whitespace in an SVG string.
 *
 * Conservative — only strips whitespace that sits **between** tags. The two
 * regexes are deliberately narrow:
 *   - `/>\s+</g`  collapses newlines/indent between `</foo>` and `<bar>`.
 *   - `/\n\s+/g` collapses leading indent on a continuation line.
 *
 * What this MUST NOT touch:
 *   - Attribute values (no `\s` inside `"…"`).
 *   - Text-node content inside `<text>` — the SVG sets `white-space: pre` so
 *     a literal space in a label is meaningful. The `>\s+<` pattern only
 *     matches when whitespace is bracketed by `>` then `<`, so `<text>hello
 *     world</text>` keeps its space (the space is between `>` and `w`).
 *
 * The final `^\s+|\s+$` trims the document edges.
 */
export function minifySvg(svg: string): string {
  return svg
    .replace(/>\s+</g, '><')
    .replace(/\n\s+/g, '\n')
    .replace(/^\s+|\s+$/g, '');
}

/**
 * Map mutually-exclusive cache flags to a `CacheMode`.
 *
 * Recognised flags (all booleans except `--cache-mode`):
 *   --no-cache       → 'off'
 *   --refresh-cache  → 'refresh'
 *   --frozen-cache   → 'frozen'
 *   --cache-mode X   → X (must be one of the four CacheMode strings)
 *
 * No flag → 'normal'.
 *
 * Throws on conflicts (e.g. both `--no-cache` and `--frozen-cache`) and on
 * unknown `--cache-mode` values. The CLI catches and pretty-prints.
 */
export function resolveCacheMode(args: readonly string[]): CacheMode {
  const seen: { flag: string; mode: CacheMode }[] = [];
  if (args.includes('--no-cache')) seen.push({ flag: '--no-cache', mode: 'off' });
  if (args.includes('--refresh-cache')) seen.push({ flag: '--refresh-cache', mode: 'refresh' });
  if (args.includes('--frozen-cache')) seen.push({ flag: '--frozen-cache', mode: 'frozen' });

  const modeIdx = args.indexOf('--cache-mode');
  if (modeIdx !== -1) {
    const value = args[modeIdx + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error('--cache-mode requires a value (normal | refresh | frozen | off)');
    }
    if (!isCacheMode(value)) {
      throw new Error(`Invalid --cache-mode value: ${value} (expected normal | refresh | frozen | off)`);
    }
    seen.push({ flag: `--cache-mode ${value}`, mode: value });
  }

  if (seen.length > 1) {
    const flags = seen.map(s => s.flag).join(' and ');
    throw new Error(`Conflicting cache flags: can't combine ${flags}`);
  }

  return seen[0]?.mode ?? 'normal';
}

function isCacheMode(s: string): s is CacheMode {
  return s === 'normal' || s === 'refresh' || s === 'frozen' || s === 'off';
}

/**
 * Generic flag parser. Walks `args` once and classifies each token.
 *
 * Spec format:
 *   { boolean: ['static', 'minify'], value: ['config', 'output'] }
 *
 * Returns:
 *   { booleans: Set<string>, values: Record<string, string>, positional: string[], unknown: string[] }
 *
 * - A `boolean` flag is present-or-absent. The next token is NOT consumed as
 *   its value (so `--static generate` keeps `generate` positional).
 * - A `value` flag consumes the next token. Missing value → throws.
 * - Tokens not starting with `--` are positional.
 * - `--` ends flag parsing (POSIX convention); everything after is positional.
 * - Unknown `--foo` flags accumulate in `unknown` (caller decides whether to
 *   error or warn — the CLI today doesn't validate, but tests do).
 */
export interface FlagSpec {
  boolean?: readonly string[];
  value?: readonly string[];
}

export interface ParsedFlags {
  booleans: Set<string>;
  values: Record<string, string>;
  positional: string[];
  unknown: string[];
}

export function parseFlags(args: readonly string[], spec: FlagSpec): ParsedFlags {
  const booleanSet = new Set(spec.boolean ?? []);
  const valueSet = new Set(spec.value ?? []);
  const result: ParsedFlags = {
    booleans: new Set(),
    values: {},
    positional: [],
    unknown: [],
  };

  let i = 0;
  while (i < args.length) {
    const tok = args[i]!;
    if (tok === '--') {
      result.positional.push(...args.slice(i + 1));
      break;
    }
    if (tok.startsWith('--')) {
      const name = tok.slice(2);
      if (booleanSet.has(name)) {
        result.booleans.add(name);
      } else if (valueSet.has(name)) {
        const v = args[i + 1];
        if (v === undefined || v.startsWith('--')) {
          throw new Error(`--${name} requires a value`);
        }
        result.values[name] = v;
        i++;
      } else {
        result.unknown.push(tok);
      }
    } else {
      result.positional.push(tok);
    }
    i++;
  }
  return result;
}
