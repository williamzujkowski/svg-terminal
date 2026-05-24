/**
 * whoami block — returns username + existential bullets.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';

export const whoamiBlock: Block = {
  name: 'whoami',
  description: 'Username + lightly existential identity bullets',
  allowedKeys: ['bullets', 'user'] as const,

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
