/**
 * Configuration loading and merging.
 * Reads YAML config files and merges with defaults.
 */

import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import type { TerminalConfig, UserConfig } from '../types.js';
import { resolveTheme } from '../themes/index.js';
import {
  DEFAULT_ANIMATION,
  DEFAULT_CHROME,
  DEFAULT_CONFIG,
  DEFAULT_EFFECTS,
  DEFAULT_TERMINAL,
  DEFAULT_WINDOW,
} from './defaults.js';
import { validateConfig } from './schema.js';

/** Load, parse, and validate a YAML config file. */
export function loadConfig(filePath: string): UserConfig {
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(raw);
  return validateConfig(parsed);
}

/** Merge user config with defaults to produce a full TerminalConfig. */
export function mergeConfig(userConfig: UserConfig): TerminalConfig {
  const theme = resolveTheme(userConfig.theme ?? 'dracula');

  // Auto-apply matching window style and effects for themes with dedicated chrome
  const isWin95 = theme.name === 'win95';
  const autoStyle = isWin95 && !userConfig.window?.style ? 'win95' : undefined;
  const autoEffects = isWin95 && !userConfig.effects
    ? { textGlow: false, scanlines: false, shadow: true }
    : undefined;

  return {
    window: {
      ...DEFAULT_WINDOW,
      ...userConfig.window,
      ...(autoStyle ? { style: autoStyle } : {}),
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
  };
}
