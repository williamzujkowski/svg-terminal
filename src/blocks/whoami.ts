/**
 * whoami block — returns username + existential bullets.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const whoamiSchema = z.object({
  user: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  command: z.string().optional(),
}).strict();

export const whoamiBlock: Block = {
  name: 'whoami',
  description: 'Username + lightly existential identity bullets',
  configSchema: whoamiSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const user = (config['user'] as string) ?? 'dev';
    const command = (config['command'] as string) ?? 'whoami';
    const bullets = (config['bullets'] as string[]) ?? [
      'a developer?            [[fg:green]]sort of[[/fg]]',
      'a debugger?             [[fg:green]]always[[/fg]]',
      'awake?                  [[fg:yellow]]debatable[[/fg]]',
      'productive?             [[fg:red]]ask after coffee[[/fg]]',
    ];
    return {
      command,
      lines: [
        user,
        '',
        '[[dim]]but who are you really?[[/dim]]',
        ...bullets.map(b => `  • ${b}`),
      ],
    };
  },
};
