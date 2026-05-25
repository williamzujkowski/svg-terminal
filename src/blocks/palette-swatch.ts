/**
 * palette-swatch block — one-line render of the 16 ANSI palette colors.
 * Useful for theme verification + theme docs.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const COLOR_NAMES = [
  'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'orange',
  'bright_red', 'bright_green', 'bright_yellow', 'bright_blue',
  'bright_magenta', 'bright_cyan', 'bright_white', 'comment',
];

const paletteSwatchSchema = z.object({
  glyph: z.string().min(1).max(2).optional(),
  label: z.string().optional(),
  command: z.string().optional(),
}).strict();

export const paletteSwatchBlock: Block = {
  name: 'palette-swatch',
  description: 'One-line render of the theme palette — useful for theme docs',
  configSchema: paletteSwatchSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const glyph = (config['glyph'] as string) ?? '█';
    const label = (config['label'] as string) ?? 'palette:';
    const command = (config['command'] as string) ?? 'palette';

    const swatches = COLOR_NAMES.map(c => `[[fg:${c}]]${glyph}[[/fg]]`).join(' ');
    return {
      command,
      lines: [`${label} ${swatches}`],
    };
  },
};
