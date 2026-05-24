/**
 * sparkline block — ASCII sparkline from a numeric series.
 * Maps each value to one of 8 Unicode block-element heights.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const SPARK_GLYPHS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

const sparklineSchema = z.object({
  values: z.array(z.number()).min(1).optional(),
  label: z.string().optional(),
  color: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  command: z.string().optional(),
}).strict();

export const sparklineBlock: Block = {
  name: 'sparkline',
  description: 'ASCII sparkline (▁▂▄▇▆▅▃▂) for a metric trend',
  configSchema: sparklineSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const values = (config['values'] as number[]) ?? [3, 5, 2, 8, 6, 9, 7, 4, 6, 8];
    const label = (config['label'] as string) ?? 'trend';
    const color = (config['color'] as string) ?? 'green';
    const command = (config['command'] as string) ?? 'metrics --tail';

    const min = (config['min'] as number) ?? Math.min(...values);
    const max = (config['max'] as number) ?? Math.max(...values);
    const span = max - min || 1;

    const glyphs = values.map(v => {
      const idx = Math.min(SPARK_GLYPHS.length - 1, Math.max(0, Math.floor(((v - min) / span) * SPARK_GLYPHS.length)));
      return SPARK_GLYPHS[idx]!;
    }).join('');

    return {
      command,
      lines: [
        `${label}: [[fg:${color}]]${glyphs}[[/fg]]  (min ${min}, max ${max}, n=${values.length})`,
      ],
    };
  },
};
