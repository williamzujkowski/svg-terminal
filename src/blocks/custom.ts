/**
 * Custom text block — the simplest block type.
 * Outputs static text lines with optional markup.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';

/** Custom text block — renders user-provided lines. */
export const customBlock: Block = {
  name: 'custom',
  description: 'Display custom text with optional [[fg:color]] markup',

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const command = (config['command'] as string) ?? 'echo "Hello, World!"';
    const lines = (config['lines'] as string[]) ?? ['Hello, World!'];
    const color = config['color'] as string | undefined;

    return { command, lines, color };
  },
};
