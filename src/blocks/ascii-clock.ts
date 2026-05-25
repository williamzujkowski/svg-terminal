/**
 * ascii-clock block — HH:MM:SS clock with pulsing colon separators.
 * Time is baked at generation; the animation just pulses the colons so the
 * output feels alive without the timestamp drifting against context.now.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const asciiClockSchema = z.object({
  format: z.enum(['12h', '24h']).optional(),
  color: z.string().optional(),
  label: z.string().optional(),
  command: z.string().optional(),
}).strict();

export const asciiClockBlock: Block = {
  name: 'ascii-clock',
  description: 'HH:MM:SS clock with pulsing colon separators',
  configSchema: asciiClockSchema,

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const format = (config['format'] as '12h' | '24h') ?? '24h';
    const color = (config['color'] as string) ?? 'cyan';
    const label = (config['label'] as string) ?? '';
    const command = (config['command'] as string) ?? 'date +%H:%M:%S';

    const h24 = context.now.getHours();
    const m = String(context.now.getMinutes()).padStart(2, '0');
    const s = String(context.now.getSeconds()).padStart(2, '0');
    let hh: string;
    let suffix = '';
    if (format === '12h') {
      const h12 = h24 % 12 || 12;
      hh = String(h12).padStart(2, '0');
      suffix = h24 >= 12 ? ' PM' : ' AM';
    } else {
      hh = String(h24).padStart(2, '0');
    }

    const labelPart = label ? `${label}  ` : '';
    // Two frames: colons visible, then dim. Cycles ~1 Hz.
    const frameWithColons = [`${labelPart}[[fg:${color}]]${hh}:${m}:${s}${suffix}[[/fg]]`];
    const frameWithDots = [`${labelPart}[[fg:${color}]]${hh}·${m}·${s}${suffix}[[/fg]]`];

    return {
      command,
      lines: frameWithColons,
      animation: { frames: [frameWithColons, frameWithDots], fps: 1 },
    };
  },
};
