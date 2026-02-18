/**
 * Fortune block — displays a random fortune/quote.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';
import { createRoundedBox } from '../core/box-generator.js';

/** Fortune/quote block. */
export const fortuneBlock: Block = {
  name: 'fortune',
  description: 'Display a random fortune or quote in an ASCII box',

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const fortunes = (config['fortunes'] as string[]) ?? [
      'The best code is no code at all.',
      'Talk is cheap. Show me the code. — Linus Torvalds',
      'First, solve the problem. Then, write the code.',
    ];
    const command = (config['command'] as string) ?? 'fortune';
    const width = (config['width'] as number) ?? 48;

    // Pick fortune based on time rotation
    const index = Math.floor(context.now.getTime() / 3600000) % fortunes.length;
    const fortune = fortunes[index] ?? fortunes[0] ?? '';

    const box = createRoundedBox(['', ` ${fortune}`, ''], width);
    const lines = box.split('\n');

    return { command, lines, color: config['color'] as string | undefined };
  },
};
