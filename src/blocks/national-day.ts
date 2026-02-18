/**
 * National day block — displays today's national/fun day.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';
import { createRoundedBox } from '../core/box-generator.js';

interface DayEntry {
  name: string;
  desc: string;
  emoji: string;
}

/** National day display block. */
export const nationalDayBlock: Block = {
  name: 'national-day',
  description: 'Display a fun national day celebration',

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const days = (config['days'] as DayEntry[]) ?? [];
    const width = (config['width'] as number) ?? 56;

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

    const name = day.name.length > 32 ? day.name.substring(0, 29) + '...' : day.name;
    const desc = day.desc.length > 38 ? day.desc.substring(0, 35) + '...' : day.desc;

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
