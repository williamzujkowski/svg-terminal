/**
 * Default configuration values for svg-terminal.
 */

import type {
  AnimationConfig,
  ChromeConfig,
  EffectsConfig,
  TerminalConfig,
  TerminalTextConfig,
  WindowConfig,
} from '../types.js';
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

export const DEFAULT_ANIMATION: AnimationConfig = {
  cursorBlinkCycle: 1000,
  charAppearDuration: 10,
  outputLineStagger: 50,
  commandOutputPause: 300,
  scrollDelay: 10,
  outputEndPause: 200,
  defaultTypingDuration: 2000,
  defaultSequencePause: 1000,
};

export const DEFAULT_CHROME: ChromeConfig = {
  titleFontSize: 13,
  buttonRadius: 6,
  buttonSpacing: 20,
  dimOpacity: 0.6,
  buttonY: 16,
};

export const DEFAULT_CONFIG: TerminalConfig = {
  window: DEFAULT_WINDOW,
  text: DEFAULT_TERMINAL,
  theme: dracula,
  effects: DEFAULT_EFFECTS,
  animation: DEFAULT_ANIMATION,
  chrome: DEFAULT_CHROME,
  maxDuration: 90,
  scrollDuration: 100,
};

// ============================================================================
// Internal constants (NOT user-facing config)
// ============================================================================

/** Monospace character width as a fraction of font size. */
export const CHAR_WIDTH_RATIO = 0.6;

/** Cursor vertical offset as a fraction of font size. */
export const CURSOR_Y_OFFSET_RATIO = -0.85;

/** Phosphor glow blur standard deviations [core, medium, outer]. */
export const GLOW_BLUR_VALUES = [0.2, 1.5, 3.5] as const;

/** Shadow filter parameters. */
export const SHADOW_PARAMS = { dy: 15, blur: 15, opacity: 0.8 } as const;

/** Scanline pattern dimensions. */
export const SCANLINE_PARAMS = { height: 2, opacity: 0.02 } as const;

/** Scroll animation duration in ms (for SVG animateTransform). */
export const SCROLL_ANIM_DURATION = 100;

// ============================================================================
// Preset resolvers
// ============================================================================

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
