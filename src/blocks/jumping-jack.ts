/**
 * jumping-jack block — a 3-row stick figure doing jumping jacks.
 *
 * The first built-in to exercise MULTI-LINE animation frames (#69): each frame
 * is an array of rows rather than a single line. Renders as a per-frame
 * `<g class="frame-cycle-N">` of stacked `<text>` rows (see line-renderer.ts).
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

// Two 3-row poses, alternating: arms-up/legs-apart ↔ arms-down/legs-together.
// Each row is padded to the same width so neither pose shifts horizontally.
const POSE_OPEN = ['\\o/', ' | ', '/ \\'];
const POSE_SHUT = [' o ', '/|\\', ' | '];

const jumpingJackSchema = z.object({
  fps: z.number().int().min(1).max(30).optional(),
  command: z.string().optional(),
  color: z.string().optional(),
}).strict();

export const jumpingJackBlock: Block = {
  name: 'jumping-jack',
  description: 'A multi-line stick figure doing jumping jacks',
  configSchema: jumpingJackSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const fps = (config['fps'] as number) ?? 2;
    const command = (config['command'] as string) ?? 'exercise';
    const color = (config['color'] as string) ?? 'yellow';

    // Wrap every row in the fg-color markup so each pose paints in `color`.
    const paint = (rows: string[]): string[] =>
      rows.map(r => `[[fg:${color}]]${r}[[/fg]]`);
    const frames = [paint(POSE_OPEN), paint(POSE_SHUT)];

    return {
      command,
      lines: frames[0]!, // static fallback (first pose, all 3 rows)
      animation: { frames, fps },
    };
  },
};
