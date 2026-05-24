/**
 * build-badge block — terminal-style project status card.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

type BadgeState = 'ok' | 'warn' | 'fail';

interface BadgeEntry {
  label: string;
  status: BadgeState | string;
  value?: string;
}

const badgeEntrySchema = z.object({
  label: z.string(),
  status: z.string(),
  value: z.string().optional(),
}).strict();

const buildBadgeSchema = z.object({
  badges: z.array(badgeEntrySchema).optional(),
  command: z.string().optional(),
}).strict();

const STATE_GLYPH: Record<string, { glyph: string; color: string }> = {
  ok: { glyph: '✓', color: 'green' },
  warn: { glyph: '⚠', color: 'yellow' },
  fail: { glyph: '✗', color: 'red' },
};

export const buildBadgeBlock: Block = {
  name: 'build-badge',
  description: 'Terminal-style project status card (tests / lint / coverage)',
  configSchema: buildBadgeSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const badges = (config['badges'] as BadgeEntry[]) ?? [
      { label: 'tests', status: 'ok', value: '243 passing' },
      { label: 'lint', status: 'ok' },
      { label: 'coverage', status: 'warn', value: '82%' },
      { label: 'build', status: 'ok' },
    ];
    const command = (config['command'] as string) ?? 'npm run ci';

    const lines = badges.map(b => {
      const meta = STATE_GLYPH[b.status] ?? { glyph: '·', color: 'comment' };
      const val = b.value ? ` ${b.value}` : '';
      return `  [[fg:${meta.color}]]${meta.glyph}[[/fg]] ${b.label.padEnd(10)}${val}`;
    });

    return {
      command,
      lines: ['', ...lines, ''],
    };
  },
};
