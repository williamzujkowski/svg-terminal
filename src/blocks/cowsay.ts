/**
 * cowsay block — speech bubble + the iconic ASCII cow.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const cowsaySchema = z.object({
  say: z.string().optional(),
  width: z.number().int().min(8).max(200).optional(),
  command: z.string().optional(),
}).strict();

/** Word-wrap a string to a max width, breaking on spaces. Long words are sliced. */
function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    if (para.length === 0) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (word.length === 0) continue;
      if (word.length > width) {
        if (line) out.push(line);
        for (let i = 0; i < word.length; i += width) out.push(word.slice(i, i + width));
        line = '';
        continue;
      }
      const next = line ? `${line} ${word}` : word;
      if (next.length > width) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function bubble(lines: string[], inner: number): string[] {
  if (lines.length === 0) return [];
  const out: string[] = [];
  out.push(' ' + '_'.repeat(inner + 2));
  if (lines.length === 1) {
    out.push(`< ${lines[0]!.padEnd(inner)} >`);
  } else {
    for (let i = 0; i < lines.length; i++) {
      const left = i === 0 ? '/' : i === lines.length - 1 ? '\\' : '|';
      const right = i === 0 ? '\\' : i === lines.length - 1 ? '/' : '|';
      out.push(`${left} ${lines[i]!.padEnd(inner)} ${right}`);
    }
  }
  out.push(' ' + '-'.repeat(inner + 2));
  return out;
}

const COW = [
  '        \\   ^__^',
  '         \\  (oo)\\_______',
  '            (__)\\       )\\/\\',
  '                ||----w |',
  '                ||     ||',
];

export const cowsayBlock: Block = {
  name: 'cowsay',
  description: 'A cow says something. The cow is always right.',
  configSchema: cowsaySchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const command = (config['command'] as string) ?? 'cowsay';
    const say = (config['say'] as string) ?? 'moo. I am a cow.';
    const width = Math.max(8, (config['width'] as number) ?? 40);
    const wrapped = wrap(say, width);
    const inner = Math.max(...wrapped.map(l => l.length), 1);
    return {
      command,
      lines: [...bubble(wrapped, inner), ...COW],
    };
  },
};
