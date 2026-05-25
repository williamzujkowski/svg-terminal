/**
 * dice-roll block — N d6 dice tumble and land on a configured (or daily-stable) result.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const DIE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const;

const diceRollSchema = z.object({
  count: z.number().int().min(1).max(8).optional(),
  result: z.array(z.number().int().min(1).max(6)).optional(),
  color: z.string().optional(),
  fps: z.number().int().min(1).max(30).optional(),
  command: z.string().optional(),
}).strict();

/** Deterministic PRNG so the same day yields the same tumble (stable in CI). */
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

export const diceRollBlock: Block = {
  name: 'dice-roll',
  description: 'Roll N d6 dice with a tumble animation that lands on a result',
  configSchema: diceRollSchema,

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const count = (config['count'] as number) ?? 3;
    const color = (config['color'] as string) ?? 'yellow';
    const fps = (config['fps'] as number) ?? 6;
    const command = (config['command'] as string) ?? `roll ${count}d6`;

    const dayOfYear = Math.floor(context.now.getTime() / 86400000);
    const rand = mulberry32(dayOfYear);

    // Configured result wins; otherwise pick deterministic per-day dice.
    const result = (config['result'] as number[]) ?? Array.from({ length: count }, () => 1 + Math.floor(rand() * 6));

    // Tumble: 6 random frames, then land on the result.
    const tumbleFrames: string[][] = [];
    for (let i = 0; i < 6; i++) {
      const faces = Array.from({ length: count }, () => DIE_FACES[Math.floor(rand() * 6)]!);
      tumbleFrames.push([`[[fg:${color}]]${faces.join(' ')}[[/fg]]  tumbling…`]);
    }
    const finalFaces = result.map(n => DIE_FACES[Math.max(0, Math.min(5, n - 1))]!).join(' ');
    const total = result.reduce((a, b) => a + b, 0);
    tumbleFrames.push([`[[fg:${color}]]${finalFaces}[[/fg]]  → ${total}`]);

    return {
      command,
      lines: tumbleFrames[tumbleFrames.length - 1]!, // static fallback = final roll
      animation: { frames: tumbleFrames, fps, loop: false },
    };
  },
};
