/**
 * segfault block — fake core dump for low-level humor.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';

export const segfaultBlock: Block = {
  name: 'segfault',
  description: 'Fake segmentation fault with a corrupted backtrace',
  allowedKeys: ['program'] as const,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const command = (config['command'] as string) ?? './a.out';
    const program = (config['program'] as string) ?? 'a.out';
    return {
      command,
      lines: [
        `[[fg:red]]Segmentation fault (core dumped)[[/fg]]  [[dim]](${program})[[/dim]]`,
        '',
        '  fault address:  [[fg:cyan]]0xDEADBEEF[[/fg]]',
        '  rip:            [[fg:cyan]]0xCAFEBABE[[/fg]]',
        '  rsp:            [[fg:red]]CORRUPTED[[/fg]]',
        '',
        '[[fg:yellow]]backtrace:[[/fg]]',
        '  #0  0x4141414141 in [[fg:cyan]]main[[/fg]] ()',
        '  #1  0x4242424242 in [[fg:cyan]]definitely_not_a_bug[[/fg]] ()',
        '  #2  0x???        in [[fg:red]]<corrupted>[[/fg]]',
        '',
        '[[dim]]  Tip: it was a null pointer. it is always a null pointer.[[/dim]]',
      ],
    };
  },
};
