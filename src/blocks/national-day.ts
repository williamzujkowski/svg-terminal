/**
 * National day block — displays today's national/fun day.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';
import { createRoundedBox } from '../core/box-generator.js';
import { resolveBoxWidth } from '../core/defaults.js';

interface DayEntry {
  name: string;
  desc: string;
  emoji: string;
}

const dayEntrySchema = z.object({
  name: z.string(),
  desc: z.string(),
  emoji: z.string(),
}).strict();

const nationalDaySchema = z.object({
  days: z.array(dayEntrySchema).optional(),
  width: z.number().positive().optional(),
  command: z.string().optional(),
}).strict();

/** National day display block. */
export const nationalDayBlock: Block = {
  name: 'national-day',
  description: 'Display a fun national day celebration',
  configSchema: nationalDaySchema,

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const days = (config['days'] as DayEntry[]) ?? [];
    const width = resolveBoxWidth(config['width'] as number | undefined, context);

    // Pick day based on day of year
    const dayOfYear = Math.floor(
      (context.now.getTime() - new Date(context.now.getFullYear(), 0, 0).getTime()) / 86400000,
    );

    const day = days.length > 0
      ? days[dayOfYear % days.length]
      : { name: 'National Coding Day', desc: 'Write some code!', emoji: '💻' };

    if (!day) {
      return { command: 'curl -s whatday.today/api | jq .today', lines: ['No days configured'] };
    }

    // Truncate to fit the box's interior width (box overhead: "│ " + " │" + the
    // emoji+spacing prefix on the name line, "│   \"...\" │" on the desc line).
    // Previously hardcoded at 32/38 chars regardless of the box width config.
    const nameMax = Math.max(10, width - 14); // "│ {emoji} Today is " + " │"
    const descMax = Math.max(10, width - 8);  // "│   \"...\" │"
    const name = day.name.length > nameMax ? day.name.substring(0, nameMax - 3) + '...' : day.name;
    const desc = day.desc.length > descMax ? day.desc.substring(0, descMax - 3) + '...' : day.desc;

    const lines = ['', `${day.emoji} Today is ${name}`, `  "${desc}"`, ''];
    const box = createRoundedBox(lines, width);

    return {
      command: (config['command'] as string) ?? 'curl -s whatday.today/api | jq .today',
      lines: box.split('\n'),
      typing: 'medium',
      pause: 'medium',
    };
  },
};
