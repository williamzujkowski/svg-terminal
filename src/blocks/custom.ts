/**
 * Custom text block — the simplest block type.
 * Outputs static text lines with optional markup.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const customConfigSchema = z.object({
  command: z.string().optional(),
  lines: z.array(z.string()).optional(),
  color: z.string().optional(),
}).strict();

/** Custom text block — renders user-provided lines. */
export const customBlock: Block = {
  name: 'custom',
  description: 'Display custom text with optional [[fg:color]] markup',
  configSchema: customConfigSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const command = (config['command'] as string) ?? 'echo "Hello, World!"';
    const lines = (config['lines'] as string[]) ?? ['Hello, World!'];
    const color = config['color'] as string | undefined;

    return { command, lines, color };
  },
};
