/**
 * Core type definitions for svg-terminal.
 * All public interfaces used by the library, CLI, and plugins.
 */

// ============================================================================
// Theme Types
// ============================================================================

/** Color palette for a terminal theme. */
export interface ThemeColors {
  /** Primary text color */
  text: string;
  /** Muted/comment text */
  comment: string;
  /** Terminal background */
  background: string;
  /** Title bar background */
  titleBarBackground: string;
  /** Title bar text */
  titleBarText: string;
  /** Prompt color */
  prompt: string;
  /** Cursor color */
  cursor: string;
  /** Named semantic colors */
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  orange: string;
  purple: string;
  pink: string;
  /** Bright variants */
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
  brightBlack: string;
}

/** A complete terminal theme. */
export interface Theme {
  /** Theme name (e.g. "dracula") */
  name: string;
  /** Color palette */
  colors: ThemeColors;
  /** Title bar button colors */
  buttons: {
    close: string;
    minimize: string;
    maximize: string;
  };
}

// ============================================================================
// Terminal Configuration
// ============================================================================

/** Window/SVG dimensions and chrome. */
export interface WindowConfig {
  /** SVG width in pixels (default: 1000) */
  width: number;
  /** SVG height in pixels (default: 700) */
  height: number;
  /** Border radius for window corners (default: 12) */
  borderRadius: number;
  /** Title bar height (default: 40) */
  titleBarHeight: number;
  /** Title text shown in title bar */
  title: string;
}

/** Terminal text rendering config. */
export interface TerminalTextConfig {
  /** Font family stack (default: monospace) */
  fontFamily: string;
  /** Font size in pixels (default: 14) */
  fontSize: number;
  /** Line height multiplier (default: 1.8) */
  lineHeight: number;
  /** Left/right padding in pixels (default: 12) */
  padding: number;
  /** Top padding below title bar (default: 8) */
  paddingTop: number;
  /** Prompt string (default: "user@host:~$ ") */
  prompt: string;
}

/** Animation timing presets. */
export interface TimingPresets {
  typing: Record<string, number>;
  pause: Record<string, number>;
}

/** SVG visual effects toggles. */
export interface EffectsConfig {
  /** Enable phosphor text glow (default: true) */
  textGlow: boolean;
  /** Enable window drop shadow (default: true) */
  shadow: boolean;
  /** Enable CRT scanline effect (default: true) */
  scanlines: boolean;
}

/** Animation timing configuration. */
export interface AnimationConfig {
  /** Cursor blink cycle duration in ms (default: 1000) */
  cursorBlinkCycle: number;
  /** Duration of character appear fade-in in ms (default: 10) */
  charAppearDuration: number;
  /** Delay between output lines in ms (default: 50) */
  outputLineStagger: number;
  /** Pause after typing command before output appears in ms (default: 300) */
  commandOutputPause: number;
  /** Extra delay added to scroll events in ms (default: 10) */
  scrollDelay: number;
  /** Pause at end of output block in ms (default: 200) */
  outputEndPause: number;
  /** Default typing duration for commands in ms (default: 2000) */
  defaultTypingDuration: number;
  /** Default pause between sequences in ms (default: 1000) */
  defaultSequencePause: number;
}

/** Window chrome appearance configuration. */
export interface ChromeConfig {
  /** Title bar font size in px (default: 13) */
  titleFontSize: number;
  /** Window button radius in px (default: 6) */
  buttonRadius: number;
  /** Spacing between window buttons in px (default: 20) */
  buttonSpacing: number;
  /** Opacity for [[dim]] text (default: 0.6) */
  dimOpacity: number;
  /** Window button vertical center Y position (default: 16) */
  buttonY: number;
}

/** Full terminal generator configuration. */
export interface TerminalConfig {
  window: WindowConfig;
  text: TerminalTextConfig;
  theme: Theme;
  effects: EffectsConfig;
  animation: AnimationConfig;
  chrome: ChromeConfig;
  /** Maximum animation duration in seconds (default: 90) */
  maxDuration: number;
  /** Scroll animation duration in ms (default: 100) */
  scrollDuration: number;
}

// ============================================================================
// Sequence / Animation Types
// ============================================================================

/** A single animation sequence (command or output). */
export interface Sequence {
  /** Sequence type */
  type: 'command' | 'output';
  /** Text content */
  content: string;
  /** Override prompt for this command */
  prompt?: string;
  /** Text color override */
  color?: string;
  /** Typing duration in ms (for commands) */
  typingDuration?: number;
  /** Pause after this sequence in ms */
  pause?: number;
  /** Delay before this sequence starts in ms */
  delay?: number;
}

/** An animation frame in the timeline. */
export interface AnimationFrame {
  time: number;
  type: 'scroll' | 'add-command' | 'add-output' | 'final';
  lineIndex?: number;
  prompt?: string;
  command?: string;
  content?: string;
  color?: string;
  typingDuration?: number;
  scrollLines?: number;
  bufferStart?: number;
}

// ============================================================================
// Block / Plugin Types
// ============================================================================

/** Context passed to blocks during rendering. */
export interface BlockContext {
  /** Current date/time */
  now: Date;
  /** Terminal configuration */
  config: TerminalConfig;
  /** User-provided variables */
  variables: Record<string, unknown>;
}

/** A rendered block — produces sequences for the animation. */
export interface BlockResult {
  /** The command to display being "typed" */
  command: string;
  /** Output lines (may contain [[fg:color]] markup) */
  lines: string[];
  /** Override color for output */
  color?: string;
  /** Typing speed preset name */
  typing?: string;
  /** Pause preset name after output */
  pause?: string;
}

/** Block definition — a self-contained terminal content module. */
export interface Block {
  /** Block type name (e.g. "neofetch", "custom") */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Render the block content */
  render(context: BlockContext, blockConfig: Record<string, unknown>): BlockResult | Promise<BlockResult>;
}

// ============================================================================
// User Config (YAML)
// ============================================================================

/** Block entry in user's YAML config. */
export interface BlockEntry {
  /** Block type name */
  block: string;
  /** Block-specific configuration */
  config?: Record<string, unknown>;
  /** Override command text */
  command?: string;
  /** Override color */
  color?: string;
  /** Override typing speed */
  typing?: string;
  /** Override pause */
  pause?: string;
}

/** User-facing YAML configuration schema. */
export interface UserConfig {
  /** Theme name or custom theme object */
  theme?: string | Theme;
  /** Window dimensions */
  window?: Partial<WindowConfig>;
  /** Terminal text settings */
  terminal?: Partial<TerminalTextConfig>;
  /** Visual effects toggles */
  effects?: Partial<EffectsConfig>;
  /** Animation timing overrides */
  animation?: Partial<AnimationConfig>;
  /** Window chrome appearance overrides */
  chrome?: Partial<ChromeConfig>;
  /** Ordered list of blocks to render */
  blocks: BlockEntry[];
  /** User variables passed to blocks */
  variables?: Record<string, unknown>;
  /** Maximum animation duration in seconds */
  maxDuration?: number;
  /** Scroll animation duration in ms */
  scrollDuration?: number;
  /** Custom accessibility label for the SVG */
  accessibilityLabel?: string;
}

// ============================================================================
// Markup Types
// ============================================================================

/** A styled text span produced by the markup parser. */
export interface StyledSpan {
  text: string;
  fg: string | null;
  bg: string | null;
  bold: boolean;
  dim: boolean;
}

// ============================================================================
// Box Types
// ============================================================================

/** Box drawing style. */
export type BoxStyle = 'double' | 'rounded' | 'single' | 'heavy' | 'dashed';

/** Box character set for drawing. */
export interface BoxChars {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  separatorLeft: string;
  separatorRight: string;
}

/** Configuration for creating an ASCII box. */
export interface BoxConfig {
  /** Box style (default: 'double') */
  style?: BoxStyle;
  /** Total box width including borders (default: 56) */
  width?: number;
  /** Content lines */
  lines: string[];
  /** Line indices after which to add a separator */
  separatorAfter?: number[];
  /** Truncate lines that exceed width (default: true) */
  truncate?: boolean;
  /** Wrap lines that exceed width instead of truncating (default: false) */
  wrap?: boolean;
}
