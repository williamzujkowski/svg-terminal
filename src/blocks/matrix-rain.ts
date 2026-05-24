/**
 * matrix-rain block — single-frame ASCII Matrix screen.
 * The typing/scroll animation already provides cascade-in; no per-frame work needed.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';

const KATAKANA = 'ヲアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン';
const DIGITS = '0123456789';
const SYMBOLS = '*+-=<>:;[](){}/\\|';
const POOL = (KATAKANA + DIGITS + SYMBOLS).split('');

/** Deterministic PRNG seeded by date+row so output is stable per day. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const matrixRainBlock: Block = {
  name: 'matrix-rain',
  description: 'Single-frame Matrix rain screen with ACCESS GRANTED footer',
  allowedKeys: ['cols', 'message', 'rows'] as const,

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const command = (config['command'] as string) ?? './neo.sh';
    const rows = (config['rows'] as number) ?? 6;
    const cols = (config['cols'] as number) ?? 56;
    const message = (config['message'] as string) ?? 'access granted.';

    const dayOfYear = Math.floor(context.now.getTime() / 86400000);
    const rand = mulberry32(dayOfYear);

    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let row = '';
      for (let c = 0; c < cols; c++) {
        row += POOL[Math.floor(rand() * POOL.length)] ?? ' ';
      }
      lines.push(`[[fg:green]]${row}[[/fg]]`);
    }
    lines.push('');
    lines.push(`[[fg:green]][[bold]]> ${message}[[/bold]][[/fg]]`);

    return { command, lines, color: 'green' };
  },
};
