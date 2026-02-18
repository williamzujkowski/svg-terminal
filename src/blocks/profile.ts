/**
 * Profile block — developer/user profile info card.
 */

import type { Block, BlockResult } from '../types.js';
import { createRoundedBox } from '../core/box-generator.js';

/** Profile info card block. */
export const profileBlock: Block = {
  name: 'profile',
  description: 'Display a developer profile info card',

  render(_context, config: Record<string, unknown>): BlockResult {
    const name = (config['name'] as string) ?? 'Developer';
    const github = config['github'] as string | undefined;
    const web = config['web'] as string | undefined;
    const focus = config['focus'] as string | undefined;
    const motto = config['motto'] as string | undefined;
    const width = (config['width'] as number) ?? 56;

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
