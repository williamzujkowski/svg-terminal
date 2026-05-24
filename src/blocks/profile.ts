/**
 * Profile block — developer/user profile info card.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';
import { createRoundedBox } from '../core/box-generator.js';
import { resolveBoxWidth } from '../core/defaults.js';

const profileConfigSchema = z.object({
  name: z.string().optional(),
  github: z.string().optional(),
  web: z.string().optional(),
  focus: z.string().optional(),
  motto: z.string().optional(),
  width: z.number().positive().optional(),
  command: z.string().optional(),
}).strict();

/** Profile info card block. */
export const profileBlock: Block = {
  name: 'profile',
  description: 'Display a developer profile info card',
  configSchema: profileConfigSchema,

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const name = (config['name'] as string) ?? 'Developer';
    const github = config['github'] as string | undefined;
    const web = config['web'] as string | undefined;
    const focus = config['focus'] as string | undefined;
    const motto = config['motto'] as string | undefined;
    const width = resolveBoxWidth(config['width'] as number | undefined, context);

    const lines: string[] = ['', `👤 ${name.toUpperCase()}`, ''];
    if (github) lines.push(`GitHub:  ${github}`);
    if (web) lines.push(`Web:     ${web}`);
    if (focus) lines.push(`Focus:   ${focus}`);
    if (motto) lines.push(`Motto:   "${motto}"`);
    lines.push('');

    const box = createRoundedBox(lines, width);
    return {
      command: (config['command'] as string) ?? 'cat /etc/profile',
      lines: box.split('\n'),
      typing: 'medium',
      pause: 'medium',
    };
  },
};
