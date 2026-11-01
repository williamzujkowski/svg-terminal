/**
 * konami-code block — classic ↑ ↑ ↓ ↓ ← → ← → B A cheat code sequence.
 * Honors 1980s Konami gaming lore with interactive badges and 30-lives unlock.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const konamiCodeSchema = z.object({
  command: z.string().optional(),
  reward: z.string().optional(),
  status: z.string().optional(),
  weapon: z.string().optional(),
  lives: z.number().int().min(1).max(99).optional(),
  badgeColor: z.string().optional(),
}).strict();

export const konamiCodeBlock: Block = {
  name: 'konami-code',
  description: 'Classic Konami cheat code (↑ ↑ ↓ ↓ ← → ← → B A) sequence',
  configSchema: konamiCodeSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const command = (config['command'] as string) ?? './inject-cheat.sh';
    const reward = (config['reward'] as string) ?? '30 LIVES GRANTED // GOD MODE: ACTIVE';
    const status = (config['status'] as string) ?? 'UNTOUCHABLE';
    const weapon = (config['weapon'] as string) ?? 'SPREAD GUN';
    const lives = (config['lives'] as number) ?? 30;
    const badgeColor = (config['badgeColor'] as string) ?? 'green';

    const keys = ['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'B', 'A', 'START'];
    const keyBadges = keys
      .map(k => `[[bold]][[fg:${badgeColor}]][ ${k} ][[/fg]][[/bold]]`)
      .join(' ');

    const hearts = '♥'.repeat(Math.min(lives, 30));
    const heartGroups = hearts.match(/.{1,10}/g)?.join(' ') ?? hearts;

    const banner = `★ CHEAT CODE VERIFIED: ${reward} ★`;
    const boxWidth = Math.max(banner.length + 4, 60);
    const border = '═'.repeat(boxWidth - 2);

    const lines = [
      '',
      `  ${keyBadges}`,
      '',
      `  ╔${border}╗`,
      `  ║  [[bold]][[fg:${badgeColor}]]${banner.padEnd(boxWidth - 4)}[[/fg]][[/bold]]  ║`,
      `  ╚${border}╝`,
      '',
      `  STATUS: [[bold]][[fg:cyan]][${status}][[/fg]][[/bold]]    WEAPON: [[bold]][[fg:yellow]][${weapon}][[/fg]][[/bold]]    AMMO: [[fg:magenta]][ ∞ ][[/fg]]`,
      `  LIVES:  [[fg:red]]${heartGroups}[[/fg]] (${lives}/${lives})`,
      '',
    ];

    return {
      command,
      lines,
    };
  },
};
