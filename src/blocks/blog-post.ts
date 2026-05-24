/**
 * Blog post block — show latest blog post title.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';
import { createRoundedBox } from '../core/box-generator.js';
import { resolveBoxWidth } from '../core/defaults.js';

const blogPostSchema = z.object({
  title: z.string().optional(),
  url: z.string().optional(),
  width: z.number().positive().optional(),
  command: z.string().optional(),
}).strict();

/** Blog post display block. */
export const blogPostBlock: Block = {
  name: 'blog-post',
  description: 'Display a blog post title in a box',
  configSchema: blogPostSchema,

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const title = (config['title'] as string) ?? 'My Latest Post';
    const url = (config['url'] as string) ?? '';
    const width = resolveBoxWidth(config['width'] as number | undefined, context);

    const lines: string[] = ['', '📝 LATEST FROM THE BLOG', '', title];
    if (url) lines.push('', `🔗 ${url}`);
    lines.push('');

    const box = createRoundedBox(lines, width);
    return {
      command: (config['command'] as string) ?? 'curl -s blog/feed.xml | grep -m1 title',
      lines: box.split('\n'),
      typing: 'slow',
      pause: 'medium',
    };
  },
};
