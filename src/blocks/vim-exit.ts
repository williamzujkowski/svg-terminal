/**
 * vim-exit block — the eternal "how do I quit vim?" meme.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const vimExitSchema = z.object({
  command: z.string().optional(),
}).strict();

export const vimExitBlock: Block = {
  name: 'vim-exit',
  description: 'The classic "how do I exit vim?" message',
  configSchema: vimExitSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const command = (config['command'] as string) ?? 'vim';
    return {
      command,
      lines: [
        '[[fg:comment]]~                              VIM - Vi IMproved[[/fg]]',
        '[[fg:comment]]~                                                [[/fg]]',
        '[[fg:comment]]~                version 9.1.0                   [[/fg]]',
        '[[fg:comment]]~       by Bram Moolenaar et al.                 [[/fg]]',
        '[[fg:comment]]~                                                [[/fg]]',
        '[[fg:yellow]]How do you exit this thing?[[/fg]]',
        '',
        '  type  [[fg:cyan]]:q[[/fg]]   to quit',
        '  type  [[fg:cyan]]:q![[/fg]]  to force-quit without saving',
        '  type  [[fg:cyan]]:wq[[/fg]]  to save and quit',
        '',
        '[[dim]]  (you were never in insert mode anyway)[[/dim]]',
      ],
      pause: 'medium',
    };
  },
};
