/**
 * Fun Fact block — fetches a random useless fact from uselessfacts.jsph.pl.
 * Always SFW, no API key required.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';
import { createDoubleBox } from '../core/box-generator.js';
import { fetchJson } from '../core/http.js';

/** Useless Facts API response. */
interface FactResponse {
  id: string;
  text: string;
  source: string;
  source_url: string;
  language: string;
}

/** Fun fact block definition. */
export const funFactBlock: Block = {
  name: 'fun-fact',
  description: 'Display a random fun fact',

  async render(context: BlockContext, config: Record<string, unknown>): Promise<BlockResult> {
    const width = (config['width'] as number) ?? 58;
    const language = (config['language'] as string) ?? 'en';
    const fallback = (config['fallback'] as string)
      ?? 'Honey never spoils. Archaeologists have found 3000-year-old honey that was still edible.';
    const timeout = context.config.fetchTimeout;

    const url = `https://uselessfacts.jsph.pl/api/v2/facts/random?language=${encodeURIComponent(language)}`;
    const data = await fetchJson<FactResponse>(url, timeout);

    const factText = data?.text ?? fallback;

    // Wrap long facts for box display
    const maxLineWidth = width - 6;
    const words = factText.split(' ');
    const factLines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 > maxLineWidth) {
        factLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }
    if (currentLine) factLines.push(currentLine);

    const lines = [
      '',
      '[[fg:yellow]]DID YOU KNOW?[[/fg]]',
      '',
      ...factLines,
      '',
    ];

    const box = createDoubleBox(lines, width);
    return {
      command: (config['command'] as string) ?? 'curl -s uselessfacts.jsph.pl/api/v2/facts/random | jq .text',
      lines: box.split('\n'),
      typing: 'fast',
      pause: 'medium',
    };
  },
};
