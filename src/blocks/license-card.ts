/**
 * license-card block — small boxed license/copyright display.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';
import { createRoundedBox } from '../core/box-generator.js';
import { resolveBoxWidth } from '../core/defaults.js';

const licenseCardSchema = z.object({
  license: z.string().optional(),
  holder: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  url: z.string().optional(),
  width: z.number().positive().optional(),
  command: z.string().optional(),
}).strict();

export const licenseCardBlock: Block = {
  name: 'license-card',
  description: 'Boxed License / Copyright card — saves a README section',
  configSchema: licenseCardSchema,

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const license = (config['license'] as string) ?? 'MIT';
    const holder = (config['holder'] as string) ?? 'You';
    const year = (config['year'] as number) ?? context.now.getFullYear();
    const url = (config['url'] as string) ?? '';
    const width = resolveBoxWidth(config['width'] as number | undefined, context);
    const command = (config['command'] as string) ?? 'cat LICENSE';

    const lines: string[] = [
      '',
      `[[fg:cyan]]License:[[/fg]]   ${license}`,
      `[[fg:cyan]]Copyright:[[/fg]] © ${year} ${holder}`,
    ];
    if (url) lines.push(`[[fg:cyan]]Details:[[/fg]]   ${url}`);
    lines.push('');

    const box = createRoundedBox(lines, width);
    return {
      command,
      lines: box.split('\n'),
      typing: 'fast',
      pause: 'medium',
    };
  },
};
