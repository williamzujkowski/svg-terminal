/**
 * uptime block — ridiculous fake uptime with parenthetical commentary.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const uptimeSchema = z.object({
  days: z.number().int().min(0).optional(),
  users: z.number().int().min(0).optional(),
  load: z.tuple([z.number(), z.number(), z.number()]).optional(),
  lastIncident: z.string().optional(),
  command: z.string().optional(),
}).strict();

export const uptimeBlock: Block = {
  name: 'uptime',
  description: 'Fake uptime with absurd numbers and SRE commentary',
  configSchema: uptimeSchema,

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const days = (config['days'] as number) ?? 632;
    const users = (config['users'] as number) ?? 1;
    const load = (config['load'] as [number, number, number]) ?? [0.42, 0.37, 0.31];
    const lastIncident = (config['lastIncident'] as string) ?? 'that one incident';
    const command = (config['command'] as string) ?? 'uptime';

    const time = context.now.toLocaleTimeString('en-GB', { hour12: false });
    const loadStr = load.map(n => n.toFixed(2)).join(', ');

    return {
      command,
      lines: [
        ` ${time}  up ${days} days,  3:14,  ${users} user,  load average: ${loadStr}`,
        '',
        `[[dim]](last reboot: ${lastIncident} — don't touch it)[[/dim]]`,
        '',
        'System health: [[fg:green]]STABLE[[/fg]]',
      ],
    };
  },
};
