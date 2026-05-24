/**
 * fork-bomb block — pretends to detect a fork bomb and reasons with the user.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const forkBombSchema = z.object({
  command: z.string().optional(),
}).strict();

export const forkBombBlock: Block = {
  name: 'fork-bomb',
  description: 'Mock fork-bomb warning with practical consequences',
  configSchema: forkBombSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const command = (config['command'] as string) ?? ':(){ :|:& };:';
    return {
      command,
      lines: [
        '[[fg:red]]bash: fork-bomb pattern detected[[/fg]]',
        '',
        'Running this will:',
        '  • spawn processes until the kernel gives up',
        '  • turn your laptop fan into a leaf blower',
        '  • leave only [[fg:cyan]]REISUB[[/fg]] as escape',
        '',
        '[[fg:yellow]]Proceed? [y/N][[/fg]] [[dim]]_[[/dim]]',
        '',
        '[[dim]]  (just kidding, nothing was actually executed)[[/dim]]',
      ],
    };
  },
};
