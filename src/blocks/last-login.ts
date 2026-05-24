/**
 * last-login block — `last` output with awkward timestamps.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';

interface LoginEntry {
  user?: string;
  tty?: string;
  when: string;
  note?: string;
}

export const lastLoginBlock: Block = {
  name: 'last-login',
  description: '`last` output with embarrassing timestamps and parentheticals',

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const user = (config['user'] as string) ?? 'dev';
    const command = (config['command'] as string) ?? 'last -n 4';
    const entries = (config['entries'] as LoginEntry[]) ?? [
      { tty: 'pts/0', when: 'Tue  03:47 - still logged in', note: 'debugging sleep.c' },
      { tty: 'pts/1', when: 'Mon  23:12 - 23:13  (00:01)', note: 'oops wrong button' },
      { tty: 'pts/0', when: 'Mon  14:33 - 14:34  (00:01)', note: 'left slack open' },
      { tty: 'pts/0', when: 'Fri  09:00 - still logged in', note: 'actually working?' },
    ];

    const lines = entries.map(e => {
      const u = (e.user ?? user).padEnd(8);
      const tty = (e.tty ?? 'pts/0').padEnd(7);
      const note = e.note ? `   [[dim]](${e.note})[[/dim]]` : '';
      return `${u} ${tty} ${e.when}${note}`;
    });

    return { command, lines };
  },
};
