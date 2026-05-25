/**
 * semver-bump block — shows current version + the major/minor/patch bump previews.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const semverBumpSchema = z.object({
  current: z.string().regex(/^\d+\.\d+\.\d+$/, 'current must be a semver triple like 1.2.3').optional(),
  highlight: z.enum(['major', 'minor', 'patch', 'none']).optional(),
  command: z.string().optional(),
}).strict();

export const semverBumpBlock: Block = {
  name: 'semver-bump',
  description: 'Current semver + bump preview (major/minor/patch)',
  configSchema: semverBumpSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const current = (config['current'] as string) ?? '1.2.3';
    const highlight = (config['highlight'] as 'major' | 'minor' | 'patch' | 'none') ?? 'none';
    const command = (config['command'] as string) ?? 'npm version --preview';

    const [maj, min, patch] = current.split('.').map(Number) as [number, number, number];
    const bumps = {
      major: `${maj + 1}.0.0`,
      minor: `${maj}.${min + 1}.0`,
      patch: `${maj}.${min}.${patch + 1}`,
    };
    const tag = (kind: 'major' | 'minor' | 'patch'): string => {
      const color = kind === highlight ? 'green' : 'comment';
      const arrow = kind === highlight ? '→' : ' ';
      return `  [[fg:${color}]]${arrow} ${kind.padEnd(5)} ${bumps[kind]}[[/fg]]`;
    };

    return {
      command,
      lines: [
        `[[fg:cyan]]current[[/fg]]   ${current}`,
        '',
        tag('major'),
        tag('minor'),
        tag('patch'),
      ],
    };
  },
};
