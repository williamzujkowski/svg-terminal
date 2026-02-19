/**
 * Quote block — fetches a random inspirational quote from dummyjson.com.
 * No rate limit, no API key required, 1318 quotes in the database.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';
import { createDoubleBox } from '../core/box-generator.js';
import { fetchJson } from '../core/http.js';

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

  async render(context: BlockContext, config: Record<string, unknown>): Promise<BlockResult> {
    const width = (config['width'] as number) ?? 58;
    const fallbackQuote = (config['fallback'] as string) ?? 'The only way to do great work is to love what you do.';
    const fallbackAuthor = (config['fallbackAuthor'] as string) ?? 'Steve Jobs';
    const timeout = context.config.fetchTimeout;

    const data = await fetchJson<QuoteResponse>('https://dummyjson.com/quotes/random', timeout);

    const quote = data?.quote ?? fallbackQuote;
    const author = data?.author ?? fallbackAuthor;

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
    };
  },
};
