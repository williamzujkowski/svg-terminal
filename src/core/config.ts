/**
 * Configuration loading and merging.
 * Reads YAML config files and merges with defaults.
 */

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { TerminalConfig, UserConfig } from '../types.js';
import { resolveTheme, listThemes, getTheme } from '../themes/index.js';
import { getBlock } from '../blocks/registry.js';
import {
  DEFAULT_ACCESSIBILITY,
  DEFAULT_ANIMATION,
  DEFAULT_CHROME,
  DEFAULT_CONFIG,
  DEFAULT_EFFECTS,
  DEFAULT_TERMINAL,
  DEFAULT_WINDOW,
} from './defaults.js';
import { validateConfig } from './schema.js';
import { ConfigError } from './errors.js';

/**
 * Load, parse, and validate a YAML config file. Throws ConfigError on any failure.
 * js-yaml is loaded lazily so library consumers who only call `generate(parsedConfig)`
 * don't pay for the parser in their bundle.
 */
export async function loadConfig(filePath: string): Promise<UserConfig> {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new ConfigError(`Cannot read config file: ${filePath}\n  ${(err as Error).message}`);
  }

  const { default: yaml } = await import('js-yaml');
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    // js-yaml YAMLException carries mark.line / mark.column for the source location.
    const e = err as { message: string; mark?: { line: number; column: number } };
    const where = e.mark ? `:${e.mark.line + 1}:${e.mark.column + 1}` : '';
    throw new ConfigError(`YAML parse error in ${filePath}${where}\n  ${e.message}`);
  }

  let config: UserConfig;
  try {
    config = validateConfig(parsed);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues.map(i => {
        const path = i.path.length ? i.path.join('.') : '<root>';
        return `  ${path}: ${i.message}`;
      }).join('\n');
      throw new ConfigError(`Invalid config in ${filePath}:\n${issues}${hintForIssues(err)}`);
    }
    throw err;
  }

  validateNames(config, filePath);
  return config;
}

/**
 * Add a contextual hint to certain zod failures that have a known correct
 * spelling. Returns '' for issues we don't have a hint for — the standard
 * per-issue list above is the primary error message.
 */
function hintForIssues(err: z.ZodError): string {
  const hints: string[] = [];
  for (const issue of err.issues) {
    if (issue.path[0] === 'accessibility' && issue.path.length === 1) {
      // Most common: user passed `accessibility: false` to disable a11y.
      hints.push('  hint: to disable accessibility descriptions, use `accessibility: { describe: false }` (not a boolean).');
    }
    // Typo hints for unknown keys (zod .strict() schemas). The schema is now
    // strict at every level — unrecognized_keys fires when YAML has e.g.
    // `winodw:` or `terminal: fontsize:` — silent skipping was the prior
    // behavior. We surface a Levenshtein-≤2 suggestion against the known
    // keys at that path.
    if (issue.code === 'unrecognized_keys') {
      const pathKey = issue.path.length === 0 ? '<root>' : issue.path.join('.');
      const known = KNOWN_KEYS[pathKey];
      const unknown = (issue as { keys?: string[] }).keys ?? [];
      if (known) {
        for (const key of unknown) {
          const suggestion = closestKey(key, known);
          if (suggestion) {
            const where = pathKey === '<root>' ? '' : ` at ${pathKey}`;
            hints.push(`  hint: unknown key "${key}"${where} — did you mean "${suggestion}"?`);
          }
        }
      }
    }
  }
  return hints.length > 0 ? '\n' + hints.join('\n') : '';
}

/**
 * Hardcoded map of path → known-keys, used by the typo-suggestion hint. Kept
 * separate from the zod schemas because runtime introspection through zod's
 * `_def` shape isn't stable across versions, and the maintenance cost of
 * keeping this in sync is one edit per schema change.
 */
const KNOWN_KEYS: Record<string, readonly string[]> = {
  '<root>': ['theme', 'window', 'terminal', 'effects', 'animation', 'chrome', 'accessibility', 'blocks', 'variables', 'maxDuration', 'scrollDuration', 'accessibilityLabel', 'fetchTimeout', 'cacheTTL', 'cachePath'],
  window: ['width', 'height', 'borderRadius', 'titleBarHeight', 'title', 'style', 'autoHeight', 'minHeight', 'maxHeight'],
  terminal: ['fontFamily', 'fontSize', 'lineHeight', 'padding', 'paddingTop', 'prompt'],
  effects: ['textGlow', 'shadow', 'scanlines', 'vignette'],
  animation: ['cursorBlinkCycle', 'charAppearDuration', 'outputLineStagger', 'commandOutputPause', 'scrollDelay', 'outputEndPause', 'defaultTypingDuration', 'defaultSequencePause', 'loop'],
  chrome: ['titleFontFamily', 'titleFontSize', 'buttonRadius', 'buttonSpacing', 'dimOpacity', 'buttonY'],
  accessibility: ['describe'],
};

/**
 * Returns the closest key from `candidates` within Levenshtein distance 2
 * of `input`, or null if nothing fits. Distance 2 catches single-char typos
 * (winodw → window, dist 1) and transposed-pair typos (linHeight → lineHeight,
 * dist 2). For very short inputs (≤3 chars) caps at distance 1 to avoid
 * "fpo" → "foo"-style overreach.
 */
function closestKey(input: string, candidates: readonly string[]): string | null {
  const maxDist = input.length <= 3 ? 1 : 2;
  let best: { name: string; dist: number } | null = null;
  for (const c of candidates) {
    const d = levenshtein(input.toLowerCase(), c.toLowerCase());
    if (d <= maxDist && (best === null || d < best.dist)) {
      best = { name: c, dist: d };
    }
  }
  return best?.name ?? null;
}

/** Standard iterative DP Levenshtein. Inlined to avoid a dep for ~20 LOC. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length]!;
}

/** Validate theme + block names against the live registries with actionable lists. */
function validateNames(config: UserConfig, filePath: string): void {
  if (typeof config.theme === 'string') {
    if (config.theme !== 'random' && !getTheme(config.theme)) {
      const available = listThemes().join(', ');
      throw new ConfigError(
        `Unknown theme "${config.theme}" in ${filePath}\n  Available: ${available}, random`,
      );
    }
  } else if (config.theme && typeof config.theme === 'object' && (config.theme as { name?: string }).name === 'random') {
    // Inline theme object using the reserved name would shadow the
    // daily-rotation behavior (resolveTheme returns inline objects as-is).
    // Catch this at the same point registerTheme catches the string form.
    throw new ConfigError(
      `Inline theme uses the reserved name "random" in ${filePath}\n  "random" triggers daily rotation; pick a different name for your inline theme.`,
    );
  }

  for (let i = 0; i < config.blocks.length; i++) {
    const entry = config.blocks[i];
    if (!entry) continue;
    if (!getBlock(entry.block)) {
      throw new ConfigError(
        `Unknown block "${entry.block}" at blocks[${i}] in ${filePath}\n  Run "svg-terminal blocks" to list available block types.`,
      );
    }
  }
}

/** Merge user config with defaults to produce a full TerminalConfig. */
export function mergeConfig(userConfig: UserConfig): TerminalConfig {
  const theme = resolveTheme(userConfig.theme ?? 'dracula');

  // Auto-apply matching window style and effects for themes with dedicated chrome
  const isWin95 = theme.name === 'win95';
  const autoStyle = isWin95 && !userConfig.window?.style ? 'win95' : undefined;
  // Real Win95 title bars are ~18-22px, not the 40px macOS-chrome default.
  const autoTitleBarHeight = isWin95 && userConfig.window?.titleBarHeight === undefined ? 22 : undefined;

  // CRT-aesthetic themes default to vignette ON (mimics a real CRT's
  // center-hot phosphor falloff). Users opt out via `effects.vignette: false`.
  const isCrt = theme.name === 'amber' || theme.name === 'green-phosphor' || theme.name === 'cyberpunk';
  const userVignetteSet = userConfig.effects?.vignette !== undefined;

  // The OKLCH WCAG-AAA additions (v1.2.0) are designed to read crisp + modern,
  // so they default scanlines OFF — the retro CRT texture undercuts the "sharp
  // modern" intent. Users opt back in via `effects.scanlines: true`.
  const MODERN_THEMES = new Set([
    'modus-vivendi', 'oxocarbon', 'rose-pine', 'everforest',
    'kanagawa', 'flexoki', 'github-light', 'dayfox',
  ]);
  const isModern = MODERN_THEMES.has(theme.name);
  const userScanlinesSet = userConfig.effects?.scanlines !== undefined;

  const autoEffects = isWin95 && !userConfig.effects
    ? { textGlow: false, scanlines: false, shadow: true }
    : isCrt && !userVignetteSet
    ? { vignette: true }
    : isModern && !userScanlinesSet
    ? { scanlines: false }
    : undefined;

  return {
    window: {
      ...DEFAULT_WINDOW,
      ...userConfig.window,
      ...(autoStyle ? { style: autoStyle } : {}),
      ...(autoTitleBarHeight !== undefined ? { titleBarHeight: autoTitleBarHeight } : {}),
    },
    text: {
      ...DEFAULT_TERMINAL,
      ...userConfig.terminal,
    },
    theme,
    effects: {
      ...DEFAULT_EFFECTS,
      ...(autoEffects ?? {}),
      ...userConfig.effects,
    },
    animation: {
      ...DEFAULT_ANIMATION,
      ...userConfig.animation,
    },
    chrome: {
      ...DEFAULT_CHROME,
      ...userConfig.chrome,
    },
    accessibility: {
      ...DEFAULT_ACCESSIBILITY,
      ...userConfig.accessibility,
    },
    maxDuration: userConfig.maxDuration ?? DEFAULT_CONFIG.maxDuration,
    scrollDuration: userConfig.scrollDuration ?? DEFAULT_CONFIG.scrollDuration,
    fetchTimeout: userConfig.fetchTimeout ?? DEFAULT_CONFIG.fetchTimeout,
    cacheTTL: userConfig.cacheTTL ?? DEFAULT_CONFIG.cacheTTL,
    cachePath: userConfig.cachePath ?? DEFAULT_CONFIG.cachePath,
    // Optional aria-label override (#97). Unset means the auto-generated
    // command-summary / line-count label wins downstream.
    accessibilityLabel: userConfig.accessibilityLabel,
  };
}
