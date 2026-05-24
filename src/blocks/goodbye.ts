/**
 * Goodbye block — farewell message.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';
import { createDoubleBox } from '../core/box-generator.js';
import { resolveBoxWidth } from '../core/defaults.js';

const goodbyeSchema = z.object({
  lines: z.array(z.string()).optional(),
  width: z.number().positive().optional(),
  command: z.string().optional(),
}).strict();

/** Goodbye farewell block. */
export const goodbyeBlock: Block = {
  name: 'goodbye',
  description: 'Display a farewell message',
  configSchema: goodbyeSchema,

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const lines = (config['lines'] as string[]) ?? [
      '',
      'Thanks for visiting!',
      '',
      'May your:',
      '  - Code compile without warnings',
      '  - Tests pass on first try',
      '  - Bugs be easily reproducible',
      '  - Coffee stay hot',
      '  - Git conflicts be minimal',
      '',
      'See you in the commits!',
      '',
    ];
    const width = resolveBoxWidth(config['width'] as number | undefined, context);

    const box = createDoubleBox(lines, width);
    return {
      command: (config['command'] as string) ?? 'cat /etc/goodbye.txt',
      lines: box.split('\n'),
      typing: 'medium',
      pause: 'long',
    };
  },
};
