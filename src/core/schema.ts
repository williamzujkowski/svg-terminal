/**
 * Zod validation schema for UserConfig.
 * Validates YAML config at load time with helpful error messages.
 */

import { z } from 'zod';

const BlockEntrySchema = z.object({
  block: z.string().min(1, 'Block name is required'),
  config: z.record(z.string(), z.unknown()).optional(),
  command: z.string().optional(),
  color: z.string().optional(),
  typing: z.string().optional(),
  pause: z.string().optional(),
});

const WindowSchema = z.object({
  width: z.number().positive('width must be positive').optional(),
  height: z.number().positive('height must be positive').optional(),
  borderRadius: z.number().min(0).optional(),
  titleBarHeight: z.number().positive().optional(),
  title: z.string().optional(),
  style: z.enum(['macos', 'floating', 'minimal', 'none']).optional(),
  autoHeight: z.boolean().optional(),
  minHeight: z.number().positive().optional(),
  maxHeight: z.number().positive().optional(),
}).optional();

const TerminalSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.number().positive('fontSize must be positive').optional(),
  lineHeight: z.number().positive('lineHeight must be positive').optional(),
  padding: z.number().min(0).optional(),
  paddingTop: z.number().min(0).optional(),
  prompt: z.string().optional(),
}).optional();

const EffectsSchema = z.object({
  textGlow: z.boolean().optional(),
  shadow: z.boolean().optional(),
  scanlines: z.boolean().optional(),
}).optional();

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
}).optional();

const ChromeSchema = z.object({
  titleFontSize: z.number().positive('titleFontSize must be positive').optional(),
  buttonRadius: z.number().min(0).optional(),
  buttonSpacing: z.number().positive().optional(),
  dimOpacity: z.number().min(0).max(1, 'dimOpacity must be between 0 and 1').optional(),
  buttonY: z.number().min(0).optional(),
}).optional();

export const UserConfigSchema = z.object({
  theme: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  window: WindowSchema,
  terminal: TerminalSchema,
  effects: EffectsSchema,
  animation: AnimationSchema,
  chrome: ChromeSchema,
  blocks: z.array(BlockEntrySchema).min(1, 'At least one block is required'),
  variables: z.record(z.string(), z.unknown()).optional(),
  maxDuration: z.number().positive().optional(),
  scrollDuration: z.number().positive().optional(),
  accessibilityLabel: z.string().optional(),
  fetchTimeout: z.number().positive().optional(),
});

/** Validate a raw config object and return typed UserConfig or throw. */
export function validateConfig(raw: unknown): UserConfig {
  return UserConfigSchema.parse(raw) as unknown as UserConfig;
}
