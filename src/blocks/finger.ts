/**
 * finger block — faux user metadata in classic finger(1) layout.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';

export const fingerBlock: Block = {
  name: 'finger',
  description: 'Faux finger(1) user info card',

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const user = (config['user'] as string) ?? 'dev';
    const command = (config['command'] as string) ?? `finger ${user}`;
    const shell = (config['shell'] as string) ?? '/bin/bash (and vim, and screaming)';
    const directory = (config['directory'] as string) ?? `/home/${user}`;
    const lastLogin = (config['lastLogin'] as string) ?? '2 minutes ago, from keyboard';
    const mail = (config['mail'] as number) ?? 842;
    const plan = (config['plan'] as string[]) ?? [
      'too many tabs open',
      'coffee dependency: critical',
      'debugger of broken dreams',
    ];

    return {
      command,
      lines: [
        `Login:     ${user}`,
        `Directory: ${directory}`,
        `Shell:     ${shell}`,
        `Last login: ${lastLogin}`,
        `New mail:  [[fg:red]]${mail}[[/fg]] [[dim]](unread since 2019)[[/dim]]`,
        '',
        'Plan:',
        ...plan.map(p => `  • ${p}`),
      ],
    };
  },
};
