/**
 * toc block — auto-generates a markdown anchor-link TOC from a list of section titles.
 * Each title becomes `  • Title  → #anchor` where the anchor is the github-flavored
 * lowercase-and-dashed slug.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const tocSchema = z.object({
  title: z.string().optional(),
  sections: z.array(z.string()).min(1).optional(),
  color: z.string().optional(),
  command: z.string().optional(),
}).strict();

/**
 * GitHub-flavored anchor slug: lower, strip non-anchor punctuation, then
 * each whitespace char becomes its own dash (GH does NOT collapse runs —
 * "Foo & Bar" → "foo--bar" because the ampersand drop leaves two spaces).
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s/g, '-');
}

export const tocBlock: Block = {
  name: 'toc',
  description: 'Auto-generates a markdown anchor-link table of contents',
  configSchema: tocSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const title = (config['title'] as string) ?? 'Table of Contents';
    const color = (config['color'] as string) ?? 'cyan';
    const sections = (config['sections'] as string[]) ?? [
      'Introduction',
      'Getting Started',
      'Configuration',
      'Examples',
      'Contributing',
    ];
    const command = (config['command'] as string) ?? 'cat TOC.md';

    const lines: string[] = [`[[fg:${color}]][[bold]]${title}[[/bold]][[/fg]]`, ''];
    for (const s of sections) {
      lines.push(`  • ${s}  [[dim]]→ #${slugify(s)}[[/dim]]`);
    }

    return {
      command,
      lines,
      typing: 'fast',
      pause: 'medium',
    };
  },
};
