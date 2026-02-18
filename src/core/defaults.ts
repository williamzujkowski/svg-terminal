/**
 * Default configuration values for svg-terminal.
 */

import type { EffectsConfig, TerminalConfig, TerminalTextConfig, WindowConfig } from '../types.js';
import { dracula } from '../themes/dracula.js';

export const DEFAULT_WINDOW: WindowConfig = {
  width: 1000,
  height: 700,
  borderRadius: 12,
  titleBarHeight: 40,
  title: 'user@terminal:~',
};

export const DEFAULT_TERMINAL: TerminalTextConfig = {
  fontFamily: 'JetBrains Mono, Fira Code, Ubuntu Mono, Consolas, Monaco, monospace',
  fontSize: 14,
  lineHeight: 1.8,
  padding: 12,
  paddingTop: 8,
  prompt: 'user@host:~$ ',
};

export const DEFAULT_EFFECTS: EffectsConfig = {
  textGlow: true,
  shadow: true,
  scanlines: true,
};

export const DEFAULT_CONFIG: TerminalConfig = {
  window: DEFAULT_WINDOW,
  text: DEFAULT_TERMINAL,
  theme: dracula,
  effects: DEFAULT_EFFECTS,
  maxDuration: 90,
  scrollDuration: 100,
};

/** Typing speed presets in milliseconds. */
export const TYPING_PRESETS: Record<string, number> = {
  instant: 400,
  fast: 500,
  quick: 800,
  medium: 1200,
  standard: 1400,
  slow: 1800,
  long: 2200,
};

/** Pause duration presets in milliseconds. */
export const PAUSE_PRESETS: Record<string, number> = {
  minimal: 300,
  short: 500,
  quick: 600,
  medium: 800,
  standard: 1000,
  long: 1400,
  dramatic: 1800,
  showcase: 2800,
};

/** Resolve a typing speed from a preset name or number. */
export function resolveTyping(value: string | number | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return TYPING_PRESETS[value] ?? 1200;
  return 1200;
}

/** Resolve a pause duration from a preset name or number. */
export function resolvePause(value: string | number | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return PAUSE_PRESETS[value] ?? 1000;
  return 1000;
}
