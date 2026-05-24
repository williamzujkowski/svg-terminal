/**
 * sudo-sandwich block — xkcd 149 callback.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const sudoSandwichSchema = z.object({
  user: z.string().optional(),
  command: z.string().optional(),
}).strict();

export const sudoSandwichBlock: Block = {
  name: 'sudo-sandwich',
  description: 'xkcd 149 "make me a sandwich" callback',
  configSchema: sudoSandwichSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const user = (config['user'] as string) ?? 'dev';
    const command = (config['command'] as string) ?? 'sudo make me a sandwich';
    return {
      command,
      lines: [
        `[sudo] password for ${user}:`,
        '',
        '[[fg:green]]OK.[[/fg]]',
        '',
        '[[dim]]  (Reference: https://xkcd.com/149/)[[/dim]]',
      ],
    };
  },
};
