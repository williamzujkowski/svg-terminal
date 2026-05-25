/**
 * ascii-calendar block — current month grid with today highlighted.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const asciiCalendarSchema = z.object({
  highlightColor: z.string().optional(),
  weekStart: z.enum(['sun', 'mon']).optional(),
  command: z.string().optional(),
}).strict();

export const asciiCalendarBlock: Block = {
  name: 'ascii-calendar',
  description: 'Current-month calendar grid with today highlighted',
  configSchema: asciiCalendarSchema,

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const highlightColor = (config['highlightColor'] as string) ?? 'green';
    const weekStart = (config['weekStart'] as 'sun' | 'mon') ?? 'sun';
    const command = (config['command'] as string) ?? 'cal';

    const today = context.now;
    const year = today.getFullYear();
    const month = today.getMonth();
    const todayDate = today.getDate();
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Offset: how many empty cells before the 1st falls on its weekday column.
    const startOffset = weekStart === 'mon'
      ? (firstDow + 6) % 7  // shift Mon=0
      : firstDow;

    const header = weekStart === 'mon' ? 'Mo Tu We Th Fr Sa Su' : 'Su Mo Tu We Th Fr Sa';
    const title = `[[fg:cyan]]${MONTH_NAMES[month]} ${year}[[/fg]]`;

    const cells: string[] = [];
    for (let i = 0; i < startOffset; i++) cells.push('  '); // blank
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = String(d).padStart(2, ' ');
      cells.push(d === todayDate ? `[[fg:${highlightColor}]][[bold]]${cell}[[/bold]][[/fg]]` : cell);
    }
    // Pad to a multiple of 7 so the grid renders square.
    while (cells.length % 7 !== 0) cells.push('  ');

    const rows: string[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7).join(' '));
    }

    return {
      command,
      lines: [title, header, ...rows],
      typing: 'fast',
      pause: 'medium',
    };
  },
};
