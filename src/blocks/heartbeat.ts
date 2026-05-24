/**
 * heartbeat block — pulsing heart that beats.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

// 5 frames: small → med → BIG → med → small. Beat rhythm = systole + diastole.
const HEART_FRAMES = [' . ', ' ♥ ', ' ♥ ', ' ♥ ', ' . '];

const heartbeatSchema = z.object({
  label: z.string().optional(),
  color: z.string().optional(),
  fps: z.number().int().min(1).max(30).optional(),
  command: z.string().optional(),
}).strict();

export const heartbeatBlock: Block = {
  name: 'heartbeat',
  description: 'Pulsing heart for a project you love',
  configSchema: heartbeatSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const label = (config['label'] as string) ?? 'with love';
    const color = (config['color'] as string) ?? 'red';
    const fps = (config['fps'] as number) ?? 4;
    const command = (config['command'] as string) ?? 'made-with --love';

    const frames = HEART_FRAMES.map(g => [`[[fg:${color}]]${g}[[/fg]] ${label}`]);

    return {
      command,
      lines: frames[0]!,
      animation: { frames, fps },
    };
  },
};
