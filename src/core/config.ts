/**
 * Configuration loading and merging.
 * Reads YAML config files and merges with defaults.
 */

import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { z } from 'zod';
import type { TerminalConfig, UserConfig } from '../types.js';
import { resolveTheme, listThemes, getTheme } from '../themes/index.js';
import { getBlock } from '../blocks/registry.js';
import {
  DEFAULT_ANIMATION,
  DEFAULT_CHROME,
  DEFAULT_CONFIG,
  DEFAULT_EFFECTS,
  DEFAULT_TERMINAL,
  DEFAULT_WINDOW,
} from './defaults.js';
import { validateConfig } from './schema.js';
import { ConfigError } from './errors.js';

/** Load, parse, and validate a YAML config file. Throws ConfigError on any failure. */
export function loadConfig(filePath: string): UserConfig {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new ConfigError(`Cannot read config file: ${filePath}\n  ${(err as Error).message}`);
  }

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
      throw new ConfigError(`Invalid config in ${filePath}:\n${issues}`);
    }
    throw err;
  }

  validateNames(config, filePath);
  return config;
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
  const autoEffects = isWin95 && !userConfig.effects
    ? { textGlow: false, scanlines: false, shadow: true }
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
    maxDuration: userConfig.maxDuration ?? DEFAULT_CONFIG.maxDuration,
    scrollDuration: userConfig.scrollDuration ?? DEFAULT_CONFIG.scrollDuration,
    fetchTimeout: userConfig.fetchTimeout ?? DEFAULT_CONFIG.fetchTimeout,
    cacheTTL: userConfig.cacheTTL ?? DEFAULT_CONFIG.cacheTTL,
    cachePath: userConfig.cachePath ?? DEFAULT_CONFIG.cachePath,
  };
}
