/**
 * whoami block — returns username + existential bullets.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const whoamiSchema = z.object({
  user: z.string().optional(),
  /** UID, GID, and group memberships for the default 1-line `whoami -a` style. */
  uid: z.number().int().nonnegative().optional(),
  gid: z.number().int().nonnegative().optional(),
  groups: z.array(z.string()).optional(),
  /** Opt into the previous existential-bullets render (multi-line). */
  verbose: z.boolean().optional(),
  /** Override the bullets shown in verbose mode. */
  bullets: z.array(z.string()).optional(),
  command: z.string().optional(),
}).strict();

export const whoamiBlock: Block = {
  name: 'whoami',
  description: 'Real `whoami -a` style (default) or existential bullets via `verbose: true`',
  configSchema: whoamiSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const user = (config['user'] as string) ?? 'dev';
    const command = (config['command'] as string) ?? 'whoami';
    const verbose = (config['verbose'] as boolean) ?? false;

    // Default rendering: terse 1-line `uid=N(name) gid=N(name) groups=...`
    // — this is what real `whoami -a` (or `id` on Linux) outputs. Cheap to
    // tell apart from finger/last-login/who at gallery-thumbnail size.
    // Set `verbose: true` to get the previous multi-line existential bullets.
    if (!verbose) {
      const uid = (config['uid'] as number) ?? 1000;
      const gid = (config['gid'] as number) ?? 1000;
      const groups = (config['groups'] as string[]) ?? [`${uid}(${user})`, '100(users)', '27(sudo)', '999(docker)'];
      return {
        command,
        lines: [
          `uid=${uid}([[fg:green]]${user}[[/fg]]) gid=${gid}(${user}) groups=${groups.join(',')}`,
        ],
      };
    }

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
