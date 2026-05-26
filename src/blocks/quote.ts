/**
 * Quote block — fetches a random inspirational quote from dummyjson.com.
 * No rate limit, no API key required, 1318 quotes in the database.
 *
 * Offline fallback rotates through the `fortune` block's DEFAULT_FORTUNES
 * pool by day-of-time (so a frozen-cache run or network failure still gets
 * meaningful variety rather than the same Steve Jobs quote forever).
 * Users with `fallback`/`fallbackAuthor` set keep that override.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';
import { createDoubleBox } from '../core/box-generator.js';
import { fetchJson } from '../core/http.js';
import { resolveBoxWidth } from '../core/defaults.js';
import { hashConfig } from '../core/cache.js';
import { DEFAULT_FORTUNES } from './fortune.js';

const quoteSchema = z.object({
  fallback: z.string().optional(),
  fallbackAuthor: z.string().optional(),
  width: z.number().positive().optional(),
  command: z.string().optional(),
}).strict();

/** DummyJSON quote response. */
interface QuoteResponse {
  id: number;
  quote: string;
  author: string;
}

/** Quote block definition. */
export const quoteBlock: Block = {
  name: 'quote',
  description: 'Display a random inspirational quote',
  configSchema: quoteSchema,
  cacheable: true,

  async render(context: BlockContext, config: Record<string, unknown>): Promise<BlockResult> {
    const width = resolveBoxWidth(config['width'] as number | undefined, context);
    const userFallback = config['fallback'] as string | undefined;
    const userFallbackAuthor = config['fallbackAuthor'] as string | undefined;
    const timeout = context.config.fetchTimeout;

    const url = 'https://dummyjson.com/quotes/random';
    const cacheKey = `quote:${hashConfig(config)}`;
    const data = context.useCache
      ? await context.useCache(cacheKey, () => fetchJson<QuoteResponse>(url, timeout))
      : await fetchJson<QuoteResponse>(url, timeout);

    let quote: string;
    let author: string;
    const isFallback = !data;
    if (data) {
      quote = data.quote;
      author = data.author;
    } else if (userFallback) {
      // User-provided fallback wins outright.
      quote = userFallback;
      author = userFallbackAuthor ?? '';
    } else {
      // Rotate through fortune's DEFAULT_FORTUNES pool by day so a frozen
      // cache or repeated network failure doesn't show the same string
      // forever. The pool entries already encode "quote — Author" inline
      // (e.g. "Talk is cheap. Show me the code. — Linus Torvalds").
      const idx = Math.floor(context.now.getTime() / 86400000) % DEFAULT_FORTUNES.length;
      const entry = DEFAULT_FORTUNES[idx] ?? DEFAULT_FORTUNES[0]!;
      const m = /^(.*?)\s*—\s*(.+)$/.exec(entry);
      if (m) { quote = m[1]!; author = m[2]!; }
      else   { quote = entry; author = 'Unknown'; }
    }

    // Wrap long quotes manually for box display
    const maxLineWidth = width - 6; // account for box borders + padding
    const words = quote.split(' ');
    const quoteLines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 > maxLineWidth) {
        quoteLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }
    if (currentLine) quoteLines.push(currentLine);

    const lines = [
      '',
      ...quoteLines.map((l, i) => i === 0 ? `[[fg:green]]"${l}` : `[[fg:green]] ${l}`),
    ];
    // Close the color tag on the last quote line
    const lastIdx = lines.length - 1;
    lines[lastIdx] = `${lines[lastIdx]}"[[/fg]]`;
    lines.push(`[[fg:comment]]  — ${author}[[/fg]]`);
    lines.push('');

    const box = createDoubleBox(lines, width);
    return {
      command: (config['command'] as string) ?? 'fortune',
      lines: box.split('\n'),
      typing: 'fast',
      pause: 'long',
      fallback: isFallback,
    };
  },
};
