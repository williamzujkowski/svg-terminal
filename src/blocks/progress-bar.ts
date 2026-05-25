/**
 * progress-bar block — fake build progress that fills segment-by-segment.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const progressBarSchema = z.object({
  label: z.string().optional(),
  width: z.number().int().min(4).max(80).optional(),
  fps: z.number().int().min(1).max(10).optional(),
  color: z.string().optional(),
  command: z.string().optional(),
}).strict();

export const progressBarBlock: Block = {
  name: 'progress-bar',
  description: 'Fake build/install progress bar that fills 0% → 100%',
  configSchema: progressBarSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const label = (config['label'] as string) ?? 'building';
    const width = (config['width'] as number) ?? 20;
    const fps = (config['fps'] as number) ?? 4;
    const color = (config['color'] as string) ?? 'green';
    const command = (config['command'] as string) ?? './build.sh';

    // One frame per 5% step from 0 to 100. That's 21 frames; at 4 fps the
    // bar fills in ~5 s. Final frame stays (loop: false).
    const steps = 21;
    const frames: string[][] = [];
    for (let i = 0; i < steps; i++) {
      const pct = Math.round((i / (steps - 1)) * 100);
      const filled = Math.round((i / (steps - 1)) * width);
      const empty = width - filled;
      const bar = `[[fg:${color}]]${'█'.repeat(filled)}[[/fg]]${'░'.repeat(empty)}`;
      frames.push([`${label}  [${bar}] ${String(pct).padStart(3)}%`]);
    }

    return {
      command,
      lines: frames[0]!,
      animation: { frames, fps, loop: false },
    };
  },
};
