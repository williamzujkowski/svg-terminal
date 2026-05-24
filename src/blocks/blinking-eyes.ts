/**
 * blinking-eyes block — kaomoji mascot that blinks every few seconds.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

// 6 frames cycle at 2 fps = 3-second period. Open most of the cycle, blink briefly.
const EYE_FRAMES = [
  '( ◉ ◡ ◉ )',
  '( ◉ ◡ ◉ )',
  '( ◉ ◡ ◉ )',
  '( ◉ ◡ ◉ )',
  '( - ◡ - )',
  '( ◉ ◡ ◉ )',
];

const blinkingEyesSchema = z.object({
  label: z.string().optional(),
  color: z.string().optional(),
  fps: z.number().int().min(1).max(30).optional(),
  command: z.string().optional(),
}).strict();

export const blinkingEyesBlock: Block = {
  name: 'blinking-eyes',
  description: 'Kaomoji eyes that blink — README mascot that feels alive',
  configSchema: blinkingEyesSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const label = (config['label'] as string) ?? "I'm watching";
    const color = (config['color'] as string) ?? 'cyan';
    const fps = (config['fps'] as number) ?? 2;
    const command = (config['command'] as string) ?? 'whoami';

    const frames = EYE_FRAMES.map(g => [`[[fg:${color}]]${g}[[/fg]]  ${label}`]);

    return {
      command,
      lines: frames[0]!,
      animation: { frames, fps },
    };
  },
};
