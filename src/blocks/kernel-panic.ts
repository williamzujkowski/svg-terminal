/**
 * kernel-panic block — BSOD spoof rendered in terminal text.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const kernelPanicSchema = z.object({
  command: z.string().optional(),
}).strict();

export const kernelPanicBlock: Block = {
  name: 'kernel-panic',
  description: 'A friendly kernel panic / BSOD spoof',
  configSchema: kernelPanicSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const command = (config['command'] as string) ?? 'dmesg | tail';
    return {
      command,
      lines: [
        '[[fg:blue]][[bold]]:( [[/bold]][[/fg]]',
        '',
        '[[fg:white]]Your terminal ran into a problem and needs to think things over.[[/fg]]',
        '',
        '  Stop code:  [[fg:cyan]]CRITICAL_PROCESS_DIED[[/fg]]',
        '  Process:    [[fg:cyan]]hopes_and_dreams.exe[[/fg]]',
        '  Started:    Monday 09:01',
        '  Crashed:    Monday 09:02',
        '',
        '[[fg:white]]What you can try:[[/fg]]',
        '  • Reduce coffee intake (not recommended)',
        '  • Recompile with [[fg:cyan]]-O0[[/fg]] and pray',
        '  • [[fg:green]]git commit --all[[/fg]] just in case',
        '',
        '[[dim]]  collecting error info... 100%[[/dim]]',
      ],
      pause: 'long',
    };
  },
};
