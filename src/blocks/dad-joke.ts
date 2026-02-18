/**
 * Dad joke block — displays a Q&A joke in a fancy box.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';
import { createDoubleBox } from '../core/box-generator.js';

interface Joke {
  q: string;
  a: string;
  category?: string;
}

/** Dad joke block. */
export const dadJokeBlock: Block = {
  name: 'dad-joke',
  description: 'Display a dad joke in a fancy ASCII box',

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const jokes = (config['jokes'] as Joke[]) ?? [
      { q: 'Why do programmers prefer dark mode?', a: 'Because light attracts bugs!', category: 'classic' },
    ];
    const width = (config['width'] as number) ?? 56;

    // Rotate based on day
    const dayOfYear = Math.floor(
      (context.now.getTime() - new Date(context.now.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    const joke = jokes[dayOfYear % jokes.length] ?? jokes[0];
    if (!joke) {
      return { command: './dad-joke', lines: ['No jokes configured!'] };
    }

    const category = (joke.category ?? 'classic').toUpperCase();
    const dateStr = context.now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const lines: string[] = [
      '',
      `DAD JOKE OF THE DAY - ${dateStr}`,
      `Category: ${category}`,
      '',
      `Q: ${joke.q}`,
      '',
      `A: ${joke.a}`,
      '',
    ];

    const box = createDoubleBox(lines, width);
    return {
      command: (config['command'] as string) ?? './dad-joke --random --format=fancy',
      lines: box.split('\n'),
      typing: 'slow',
      pause: 'long',
    };
  },
};
