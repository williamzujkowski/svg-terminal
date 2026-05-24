/**
 * rm-rf block — dramatic fake `rm -rf /` with self-aware commentary.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';

export const rmRfBlock: Block = {
  name: 'rm-rf',
  description: 'Fake `rm -rf /` with dramatic narration',

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const command = (config['command'] as string) ?? 'sudo rm -rf / --no-preserve-root';
    return {
      command,
      lines: [
        '[[fg:red]]rm: WARNING: recursively removing root filesystem[[/fg]]',
        '',
        '  removed /etc                ✓',
        '  removed /usr/bin            ✓',
        '  removed /home               ✓  [[dim]](you are still reading this how)[[/dim]]',
        '  removed /var/log            ✓',
        "  removed [[fg:yellow]]/dev/sanity[[/fg]]      ✓  [[dim]](no such file)[[/dim]]",
        '',
        '[[fg:red]]System integrity: 0%[[/fg]]',
        '[[dim]]  Hint: update your résumé before the next standup.[[/dim]]',
      ],
      pause: 'long',
    };
  },
};
