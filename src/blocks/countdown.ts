/**
 * countdown block — counts down from N to 0, then a "go" word. One frame per integer.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const countdownSchema = z.object({
  from: z.number().int().min(1).max(60).optional(),
  go: z.string().optional(),
  color: z.string().optional(),
  fps: z.number().int().min(1).max(10).optional(),
  command: z.string().optional(),
}).strict();

export const countdownBlock: Block = {
  name: 'countdown',
  description: 'T-minus N..0..go! launch stinger',
  configSchema: countdownSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const from = (config['from'] as number) ?? 5;
    const go = (config['go'] as string) ?? '🚀 LIFT-OFF';
    const color = (config['color'] as string) ?? 'yellow';
    const fps = (config['fps'] as number) ?? 1;
    const command = (config['command'] as string) ?? './launch.sh';

    const frames: string[][] = [];
    for (let n = from; n >= 1; n--) {
      frames.push([`[[fg:${color}]]T-${String(n).padStart(2)}...[[/fg]]`]);
    }
    frames.push([`[[fg:green]][[bold]]${go}[[/bold]][[/fg]]`]);

    return {
      command,
      lines: frames[0]!,
      animation: { frames, fps, loop: false }, // play once, then freeze on GO
    };
  },
};
