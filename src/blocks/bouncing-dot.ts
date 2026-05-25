/**
 * bouncing-dot block — single glyph that ping-pongs left-right within a width.
 * Pure kinetic eye-candy; minimal logic to prove the v0.7 single-line animation
 * primitive still works for pure motion.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const bouncingDotSchema = z.object({
  width: z.number().int().min(8).max(80).optional(),
  glyph: z.string().min(1).max(2).optional(),
  color: z.string().optional(),
  fps: z.number().int().min(1).max(30).optional(),
  command: z.string().optional(),
}).strict();

export const bouncingDotBlock: Block = {
  name: 'bouncing-dot',
  description: 'A single glyph bouncing left ↔ right',
  configSchema: bouncingDotSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const width = (config['width'] as number) ?? 24;
    const glyph = (config['glyph'] as string) ?? '●';
    const color = (config['color'] as string) ?? 'magenta';
    const fps = (config['fps'] as number) ?? 8;
    const command = (config['command'] as string) ?? './bounce';

    // Ping-pong: positions 0..(width-1)..0 — full out-and-back.
    const positions: number[] = [];
    for (let i = 0; i < width; i++) positions.push(i);
    for (let i = width - 2; i > 0; i--) positions.push(i);

    const frames = positions.map(pos => {
      const left = ' '.repeat(pos);
      const right = ' '.repeat(width - pos - 1);
      return [`${left}[[fg:${color}]]${glyph}[[/fg]]${right}`];
    });

    return {
      command,
      lines: frames[0]!,
      animation: { frames, fps },
    };
  },
};
