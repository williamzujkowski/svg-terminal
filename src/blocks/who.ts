/**
 * who block — `who` output with ghost processes/abstractions personified.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

interface WhoEntry {
  user: string;
  tty?: string;
  when: string;
  note?: string;
}

const whoEntrySchema = z.object({
  user: z.string(),
  tty: z.string().optional(),
  when: z.string(),
  note: z.string().optional(),
}).strict();

const whoSchema = z.object({
  user: z.string().optional(),
  entries: z.array(whoEntrySchema).optional(),
  command: z.string().optional(),
}).strict();

export const whoBlock: Block = {
  name: 'who',
  description: '`who` output with ghost users (debugger, coffee, sanity)',
  configSchema: whoSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const user = (config['user'] as string) ?? 'dev';
    const command = (config['command'] as string) ?? 'who';
    const entries = (config['entries'] as WhoEntry[]) ?? [
      { user, tty: 'pts/0', when: 'today 09:14' },
      { user: 'debugger', tty: 'pts/1', when: 'today 09:14', note: 'the ghost in the machine' },
      { user: 'coffee',   tty: 'pts/2', when: 'today 03:47', note: 'stimulant.exe is running' },
      { user: 'sanity',   tty: '?',     when: 'last seen Friday', note: 'checked out of reality' },
    ];

    const lines = entries.map(e => {
      const u = e.user.padEnd(9);
      const tty = (e.tty ?? '?').padEnd(7);
      const note = e.note ? `   [[dim]](${e.note})[[/dim]]` : '';
      return `${u} ${tty} ${e.when}${note}`;
    });

    return { command, lines };
  },
};
