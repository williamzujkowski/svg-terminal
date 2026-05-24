/**
 * loading-spinner block — Braille spinner cycling at 8 fps.
 * First built-in to exercise the BlockResult.animation path.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const BRAILLE_FRAMES = ['⣷', '⣯', '⣟', '⡿', '⢿', '⣻', '⣽', '⣾'];

const loadingSpinnerSchema = z.object({
  label: z.string().optional(),
  fps: z.number().int().min(1).max(30).optional(),
  command: z.string().optional(),
  color: z.string().optional(),
}).strict();

export const loadingSpinnerBlock: Block = {
  name: 'loading-spinner',
  description: 'A Braille spinner that cycles continuously',
  configSchema: loadingSpinnerSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const label = (config['label'] as string) ?? 'loading';
    const fps = (config['fps'] as number) ?? 8;
    const command = (config['command'] as string) ?? 'npm install';
    const color = (config['color'] as string) ?? 'cyan';

    // Each frame: one line, spinner glyph + label
    const frames = BRAILLE_FRAMES.map(g => [`[[fg:${color}]]${g}[[/fg]] ${label}...`]);

    return {
      command,
      lines: frames[0]!, // static fallback (first frame)
      animation: { frames, fps },
    };
  },
};
