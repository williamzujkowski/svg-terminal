/**
 * retro-arcade block — 8-bit arcade cabinet screen with animated Pac-Man corridor.
 * Multi-frame animation featuring Pac-Man chomping along a pellet corridor while chasing ghosts.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const retroArcadeSchema = z.object({
  command: z.string().optional(),
  score: z.number().int().optional(),
  highScore: z.number().int().optional(),
  stage: z.number().int().optional(),
  fps: z.number().int().min(1).max(10).optional(),
}).strict();

export const retroArcadeBlock: Block = {
  name: 'retro-arcade',
  description: 'Classic 8-bit arcade screen with animated Pac-Man corridor',
  configSchema: retroArcadeSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const command = (config['command'] as string) ?? 'arcade --game pacman';
    const score = (config['score'] as number) ?? 14200;
    const highScore = (config['highScore'] as number) ?? 99990;
    const stage = (config['stage'] as number) ?? 3;
    const fps = (config['fps'] as number) ?? 4;

    const padScore = (n: number) => String(n).padStart(6, '0');
    const header = ` 1UP   ${padScore(score)}       HIGH SCORE   ${padScore(highScore)}       STAGE ${String(stage).padStart(2, '0')}`;

    // 4-frame animation of Pacman chomping across a maze corridor
    const corridorRows = [
      ' ╔══════════════════════════════════════════════════════╗',
      ' ║ · · · · · · · · · · · · · · · · · · · · · · · · · ·  ║',
      ' ║ · ╔══════╗ · ╔══════════════╗ · ╔══════════╗ · ╔══╗· ║',
    ];

    const bottomCorridor = [
      ' ║ · ╚══════╝ · ╚══════════════╝ · ╚══════════╝ · ╚══╝· ║',
      ' ╚══════════════════════════════════════════════════════╝',
      ' LIVES: [[fg:yellow]]ᗧ ᗧ ᗧ[[/fg]]           BONUS: [🍒] [🍓]           CREDIT 01',
    ];

    const actionRows = [
      ' ║   [[fg:yellow]]ᗧ[[/fg]] · · · · · (●) · · · · · · · [[fg:red]]ᗣ[[/fg]]  [[fg:cyan]]ᗣ[[/fg]]                 ║',
      ' ║   [[fg:yellow]]O[[/fg]] · · · · · (●) · · · · · · · [[fg:red]]ᗣ[[/fg]]  [[fg:cyan]]ᗣ[[/fg]]                 ║',
      ' ║   · [[fg:yellow]]ᗧ[[/fg]] · · · · (●) · · · · · · · [[fg:red]]ᗣ[[/fg]]  [[fg:cyan]]ᗣ[[/fg]]                 ║',
      ' ║   · [[fg:yellow]]O[[/fg]] · · · · (●) · · · · · · · [[fg:red]]ᗣ[[/fg]]  [[fg:cyan]]ᗣ[[/fg]]                 ║',
    ];

    const frames: string[][] = actionRows.map(action => [
      header,
      ...corridorRows,
      action,
      ...bottomCorridor,
    ]);

    return {
      command,
      lines: frames[0]!,
      animation: { frames, fps },
    };
  },
};
