/**
 * Fortune block — displays a random fortune/quote.
 *
 * Exports DEFAULT_FORTUNES so the `quote` block can fall back to this pool
 * when its upstream fetch fails (better than the previous single-Steve-Jobs
 * fallback). 25+ dev classics with author attribution where applicable.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';
import { createRoundedBox } from '../core/box-generator.js';
import { resolveBoxWidth } from '../core/defaults.js';

const fortuneConfigSchema = z.object({
  fortunes: z.array(z.string()).optional(),
  command: z.string().optional(),
  width: z.number().positive().optional(),
  color: z.string().optional(),
}).strict();

/**
 * Default fortune pool — expanded from 3 entries to ~28 dev classics so the
 * daily rotation actually feels random, and so the `quote` block has a real
 * offline fallback pool instead of one Steve Jobs quote.
 */
export const DEFAULT_FORTUNES: readonly string[] = [
  'The best code is no code at all.',
  'Talk is cheap. Show me the code. — Linus Torvalds',
  'First, solve the problem. Then, write the code.',
  'Premature optimization is the root of all evil. — Donald Knuth',
  'Walking on water and developing software from a specification are easy if both are frozen. — Edward Berard',
  'Simplicity is the soul of efficiency. — Austin Freeman',
  'Any fool can write code that a computer can understand. Good programmers write code that humans can understand. — Martin Fowler',
  'Programs must be written for people to read, and only incidentally for machines to execute. — Harold Abelson',
  'It is not enough for code to work. — Robert C. Martin',
  'There are only two hard things in Computer Science: cache invalidation and naming things. — Phil Karlton',
  'The most important property of a program is whether it accomplishes the intention of its user. — C.A.R. Hoare',
  'Code is like humor. When you have to explain it, it is bad. — Cory House',
  'Make it work, make it right, make it fast. — Kent Beck',
  'Debugging is twice as hard as writing the code. — Brian Kernighan',
  'Everybody should learn to program a computer, because it teaches you how to think. — Steve Jobs',
  'A language that doesn\'t affect the way you think about programming is not worth knowing. — Alan Perlis',
  'Software is a great combination between artistry and engineering. — Bill Gates',
  'Programming isn\'t about what you know; it\'s about what you can figure out. — Chris Pine',
  'The function of good software is to make the complex appear to be simple. — Grady Booch',
  'Truth can only be found in one place: the code. — Robert C. Martin',
  'Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday\'s code. — Christopher Thompson',
  'In order to be irreplaceable, one must always be different. — Coco Chanel',
  'When in doubt, use brute force. — Ken Thompson',
  'Controlling complexity is the essence of computer programming. — Brian Kernighan',
  'A good programmer is someone who always looks both ways before crossing a one-way street. — Doug Linder',
  'The computer was born to solve problems that did not exist before. — Bill Gates',
  'First, solve the problem. Then write the code. — John Johnson',
  'Programs are meant to be read by humans and only incidentally for computers to execute. — Donald Knuth',
];

/** Fortune/quote block. */
export const fortuneBlock: Block = {
  name: 'fortune',
  description: 'Display a random fortune or quote in an ASCII box',
  configSchema: fortuneConfigSchema,

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const fortunes = (config['fortunes'] as string[]) ?? DEFAULT_FORTUNES;
    const command = (config['command'] as string) ?? 'fortune';
    const width = resolveBoxWidth(config['width'] as number | undefined, context);

    // Daily rotation — keeps CI output stable for a 24h window.
    const index = Math.floor(context.now.getTime() / 86400000) % fortunes.length;
    const fortune = fortunes[index] ?? fortunes[0] ?? '';

    const box = createRoundedBox(['', ` ${fortune}`, ''], width);
    const lines = box.split('\n');

    return { command, lines, color: config['color'] as string | undefined };
  },
};
