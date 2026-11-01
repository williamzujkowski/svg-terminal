/**
 * rpg-battle block — classic 16-bit turn-based JRPG boss battle screen.
 * Features boss ASCII sprite, party HP/MP gauges, battle log, and action command menu.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const partyMemberSchema = z.object({
  name: z.string(),
  hp: z.number().int(),
  maxHp: z.number().int(),
  mp: z.number().int(),
  maxMp: z.number().int(),
  status: z.string().optional(),
}).strict();

const rpgBattleSchema = z.object({
  command: z.string().optional(),
  bossName: z.string().optional(),
  bossLevel: z.number().int().optional(),
  bossHp: z.number().int().optional(),
  bossMaxHp: z.number().int().optional(),
  party: z.array(partyMemberSchema).optional(),
  battleLog: z.array(z.string()).optional(),
}).strict();

function makeGauge(current: number, max: number, width = 10): string {
  const ratio = Math.max(0, Math.min(1, current / max));
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export const rpgBattleBlock: Block = {
  name: 'rpg-battle',
  description: 'Classic 16-bit turn-based RPG boss battle HUD',
  configSchema: rpgBattleSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const command = (config['command'] as string) ?? 'battle --boss cyber-dragon';
    const bossName = (config['bossName'] as string) ?? 'CYBER-DRAGON';
    const bossLevel = (config['bossLevel'] as number) ?? 99;
    const bossHp = (config['bossHp'] as number) ?? 680;
    const bossMaxHp = (config['bossMaxHp'] as number) ?? 1000;

    const party = (config['party'] as z.infer<typeof partyMemberSchema>[]) ?? [
      { name: 'HERO', hp: 245, maxHp: 280, mp: 45, maxMp: 60, status: 'READY' },
      { name: 'MAGE', hp: 110, maxHp: 140, mp: 98, maxMp: 100, status: 'CASTING' },
    ];

    const battleLog = (config['battleLog'] as string[]) ?? [
      `>> ${bossName} charges MEGAVOLT BREATH!`,
      '>> Hero prepares DEFENSIVE AEGIS! (Damage reduced by 50%)',
    ];

    const bossGauge = makeGauge(bossHp, bossMaxHp, 15);
    const bossLine = `[${bossName}] LV.${bossLevel}  HP [${bossGauge}] ${bossHp}/${bossMaxHp}`;

    const partyLines = party.map(m => {
      const hpGauge = makeGauge(m.hp, m.maxHp, 8);
      const mpGauge = makeGauge(m.mp, m.maxMp, 6);
      const st = m.status ?? 'READY';
      return `  │ ${m.name.padEnd(6)} HP: ${String(m.hp).padStart(3)}/${m.maxHp} [[[fg:green]]${hpGauge}[[/fg]]]  MP: ${String(m.mp).padStart(2)}/${m.maxMp} [[[fg:blue]]${mpGauge}[[/fg]]]  [[[fg:yellow]]${st}[[/fg]]] │`;
    });

    const lines = [
      '  ┌─────────────────────────[ BOSS BATTLE ]─────────────────────────┐',
      '  │                                                                 │',
      '  │                     / \\__                                       │',
      '  │                    (    @\\___                                   │',
      `  │                    /         O  [[bold]][[fg:red]]${bossLine}[[/fg]][[/bold]] │`,
      '  │                   /   (_____/                                   │',
      '  │                  /_____/   U                                    │',
      '  │                                                                 │',
      '  ├─────────────────────────────────────────────────────────────────┤',
      ...battleLog.map(log => `  │ [[fg:cyan]]${log.padEnd(63)}[[/fg]] │`),
      '  ├─────────────────────────────────────────────────────────────────┤',
      ...partyLines,
      '  ├─────────────────────────────────────────────────────────────────┤',
      '  │ COMMAND > [⚔️ ATTACK]    [✨ SPELL]    [🛡️ DEFEND]    [🎒 ITEM]     │',
      '  └─────────────────────────────────────────────────────────────────┘',
    ];

    return {
      command,
      lines,
    };
  },
};
