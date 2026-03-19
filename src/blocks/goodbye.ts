/**
 * Goodbye block — farewell message.
 */

import type { Block, BlockResult } from '../types.js';
import { createDoubleBox } from '../core/box-generator.js';
import { resolveBoxWidth } from '../core/defaults.js';

/** Goodbye farewell block. */
export const goodbyeBlock: Block = {
  name: 'goodbye',
  description: 'Display a farewell message',

  render(context, config: Record<string, unknown>): BlockResult {
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
