/**
 * spinning-gear block — rotating gear/cog for DevOps/infra vibes.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const GEAR_FRAMES = ['|', '/', '─', '\\'];

const spinningGearSchema = z.object({
  label: z.string().optional(),
  color: z.string().optional(),
  fps: z.number().int().min(1).max(30).optional(),
  command: z.string().optional(),
}).strict();

export const spinningGearBlock: Block = {
  name: 'spinning-gear',
  description: 'Rotating ASCII gear — the "machinery working" feel',
  configSchema: spinningGearSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const label = (config['label'] as string) ?? 'processing';
    const color = (config['color'] as string) ?? 'yellow';
    const fps = (config['fps'] as number) ?? 6;
    const command = (config['command'] as string) ?? 'service status';

    const frames = GEAR_FRAMES.map(g => [`[[fg:${color}]]${g}[[/fg]] ${label}`]);

    return {
      command,
      lines: frames[0]!,
      animation: { frames, fps },
    };
  },
};
