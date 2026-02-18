/**
 * Blog post block — show latest blog post title.
 */

import type { Block, BlockResult } from '../types.js';
import { createRoundedBox } from '../core/box-generator.js';

/** Blog post display block. */
export const blogPostBlock: Block = {
  name: 'blog-post',
  description: 'Display a blog post title in a box',

  render(_context, config: Record<string, unknown>): BlockResult {
    const title = (config['title'] as string) ?? 'My Latest Post';
    const url = (config['url'] as string) ?? '';
    const width = (config['width'] as number) ?? 56;

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
