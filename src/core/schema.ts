/**
 * Zod validation schema for UserConfig.
 * Validates YAML config at load time with helpful error messages.
 */

import { z } from 'zod';
import type { UserConfig } from '../types.js';

/**
 * Strict color validator (defense-in-depth against H1/H2 XSS).
 *
 * Color values land in SVG `fill=` attributes. Without validation, a YAML
 * config like `color: '" onmouseover="alert(1)" x="'` produces working
 * event-handler injection in the output SVG. GitHub strips event handlers
 * when serving SVGs from user-content (img.shields.io / camo proxy), but
 * many third-party SVG hosts and consumers do NOT — npm-readme, raw GH
 * via custom domain, static-site generators that embed the output.
 *
 * Accepts:
 *  - Hex strings: `#abc`, `#aabbcc` (case-insensitive)
 *  - Bare theme palette names: red, green, yellow, blue, magenta, cyan,
 *    white, orange, purple, pink, plus their `bright*` variants, plus
 *    `comment`, `prompt`, `cursor`, `text`, `background`, `brightBlack`.
 *
 * Anything else is a config error. Markup tags `[[fg:NAME]]` go through
 * the same name set in `markup-parser.resolveColor` so the surface is
 * consistent. (The emit-site `escapeXml(color)` is the belt-and-braces
 * second layer.)
 */
const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const THEME_COLOR_NAMES = new Set([
  'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'orange', 'purple', 'pink',
  'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan',
  'brightWhite', 'brightBlack',
  'text', 'comment', 'background', 'prompt', 'cursor', 'titleBarBackground', 'titleBarText',
]);
const ColorRefSchema = z.string().refine(
  (v: string) => HEX_COLOR_RE.test(v) || THEME_COLOR_NAMES.has(v),
  { message: 'color must be a hex string (#abc / #aabbcc) or a theme palette name (e.g. "cyan", "comment")' },
);

/**
 * Strict font-family validator (defense-in-depth against H3 CSS injection).
 *
 * `fontFamily` / `titleFontFamily` land inside SVG `<style>` blocks and
 * `font-family=` attributes. Unvalidated, a value like
 * `monospace; } </style><script>alert(1)</script><style>.x{` escapes the
 * style element. CSS font-family-list syntax legitimately needs commas,
 * quotes, hyphens, underscores, digits, spaces; anything else (semicolons,
 * angle brackets, slashes, parens) is suspicious in this context.
 */
const FontFamilySchema = z.string().refine(
  v => /^[A-Za-z0-9 ,'"\-_]+$/.test(v) && !/[<>;{}]/.test(v),
  { message: 'fontFamily must contain only letters, digits, spaces, commas, quotes, hyphens, underscores' },
);

const BlockEntrySchema = z.object({
  block: z.string().min(1, 'Block name is required'),
  config: z.record(z.string(), z.unknown()).optional(),
  command: z.string().optional(),
  color: ColorRefSchema.optional(),
  typing: z.string().optional(),
  pause: z.string().optional(),
});

/**
 * Strict inline-theme schema (closes H2). Validates every color slot when
 * the user passes a theme as an OBJECT (not just a name). Without this
 * schema, the prior `z.record(z.string(), z.unknown())` allowed any value
 * for any color, including attribute-breakout strings.
 */
const InlineThemeColorsSchema = z.object({
  text: ColorRefSchema,
  comment: ColorRefSchema,
  background: ColorRefSchema,
  titleBarBackground: ColorRefSchema,
  titleBarText: ColorRefSchema,
  prompt: ColorRefSchema,
  cursor: ColorRefSchema,
  red: ColorRefSchema, green: ColorRefSchema, yellow: ColorRefSchema, blue: ColorRefSchema,
  magenta: ColorRefSchema, cyan: ColorRefSchema, white: ColorRefSchema,
  orange: ColorRefSchema, purple: ColorRefSchema, pink: ColorRefSchema,
  brightRed: ColorRefSchema, brightGreen: ColorRefSchema, brightYellow: ColorRefSchema,
  brightBlue: ColorRefSchema, brightMagenta: ColorRefSchema, brightCyan: ColorRefSchema,
  brightWhite: ColorRefSchema, brightBlack: ColorRefSchema,
}).strict();

const InlineThemeSchema = z.object({
  name: z.string().min(1),
  colors: InlineThemeColorsSchema,
  buttons: z.object({
    close: ColorRefSchema,
    minimize: ColorRefSchema,
    maximize: ColorRefSchema,
  }).strict(),
}).strict();

const WindowSchema = z.object({
  width: z.number().positive('width must be positive').optional(),
  height: z.number().positive('height must be positive').optional(),
  borderRadius: z.number().min(0).optional(),
  titleBarHeight: z.number().positive().optional(),
  title: z.string().optional(),
  style: z.enum(['macos', 'win95', 'floating', 'minimal', 'none']).optional(),
  autoHeight: z.boolean().optional(),
  minHeight: z.number().positive().optional(),
  maxHeight: z.number().positive().optional(),
}).strict().optional();

const TerminalSchema = z.object({
  fontFamily: FontFamilySchema.optional(),
  fontSize: z.number().positive('fontSize must be positive').optional(),
  lineHeight: z.number().positive('lineHeight must be positive').optional(),
  padding: z.number().min(0).optional(),
  paddingTop: z.number().min(0).optional(),
  prompt: z.string().optional(),
}).strict().optional();

const EffectsSchema = z.object({
  textGlow: z.boolean().optional(),
  shadow: z.boolean().optional(),
  scanlines: z.boolean().optional(),
  vignette: z.boolean().optional(),
}).strict().optional();

const AnimationSchema = z.object({
  cursorBlinkCycle: z.number().positive('cursorBlinkCycle must be positive').optional(),
  charAppearDuration: z.number().positive('charAppearDuration must be positive').optional(),
  outputLineStagger: z.number().min(0).optional(),
  commandOutputPause: z.number().min(0).optional(),
  scrollDelay: z.number().min(0).optional(),
  outputEndPause: z.number().min(0).optional(),
  defaultTypingDuration: z.number().positive().optional(),
  defaultSequencePause: z.number().min(0).optional(),
  loop: z.union([z.boolean(), z.number().int().positive()]).optional(),
}).strict().optional();

const AccessibilitySchema = z.object({
  describe: z.boolean().optional(),
}).strict().optional();

const ChromeSchema = z.object({
  titleFontFamily: FontFamilySchema.optional(),
  titleFontSize: z.number().positive('titleFontSize must be positive').optional(),
  buttonRadius: z.number().min(0).optional(),
  buttonSpacing: z.number().positive().optional(),
  dimOpacity: z.number().min(0).max(1, 'dimOpacity must be between 0 and 1').optional(),
  buttonY: z.number().min(0).optional(),
}).strict().optional();

export const UserConfigSchema = z.object({
  theme: z.union([z.string(), InlineThemeSchema]).optional(),
  window: WindowSchema,
  terminal: TerminalSchema,
  effects: EffectsSchema,
  animation: AnimationSchema,
  chrome: ChromeSchema,
  accessibility: AccessibilitySchema,
  blocks: z.array(BlockEntrySchema).min(1, 'At least one block is required'),
  variables: z.record(z.string(), z.unknown()).optional(),
  maxDuration: z.number().positive().optional(),
  scrollDuration: z.number().positive().optional(),
  accessibilityLabel: z.string().optional(),
  fetchTimeout: z.number().positive().optional(),
  cacheTTL: z.number().int().min(0, 'cacheTTL must be ≥ 0').optional(),
  cachePath: z.string().min(1).optional(),
}).strict();

/** Validate a raw config object and return typed UserConfig or throw. */
export function validateConfig(raw: unknown): UserConfig {
  return UserConfigSchema.parse(raw) as unknown as UserConfig;
}
