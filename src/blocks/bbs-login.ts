/**
 * bbs-login block — retro 1980s BBS welcome banner.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const bbsLoginSchema = z.object({
  name: z.string().optional(),
  baud: z.number().int().optional(),
  motd: z.string().optional(),
  command: z.string().optional(),
}).strict();

export const bbsLoginBlock: Block = {
  name: 'bbs-login',
  description: 'Retro 1980s BBS welcome banner — pairs with amber / green-phosphor',
  configSchema: bbsLoginSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const name = (config['name'] as string) ?? 'TWA-BBS';
    const baud = (config['baud'] as number) ?? 9600;
    const motd = (config['motd'] as string) ?? 'No new mail. 1 user online.';
    const command = (config['command'] as string) ?? 'atdt 555-0123';

    return {
      command,
      lines: [
        'CONNECT 9600/ARQ/V.32',
        '',
        `[[fg:cyan]]   _______ _    _ ____  ____  _____[[/fg]]`,
        `[[fg:cyan]]  |__   __| |  | |  _ \\|  _ \\/ ____|[[/fg]]`,
        `[[fg:cyan]]     | |  | |  | | |_) | |_) | (___[[/fg]]`,
        `[[fg:cyan]]     | |  | |__| |  __/|  _ < \\___ \\[[/fg]]`,
        `[[fg:cyan]]     |_|   \\____/|_|   |_| \\_\\____/[[/fg]]`,
        '',
        `[[fg:yellow]]Welcome to ${name}, ${baud} baud.[[/fg]]`,
        `[[dim]]${motd}[[/dim]]`,
        '',
        '[[fg:green]]login:[[/fg]] _',
      ],
      typing: 'slow',
      pause: 'long',
    };
  },
};
