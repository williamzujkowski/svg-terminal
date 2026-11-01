/**
 * text-adventure block — classic 1980s text adventure (Zork / Infocom) format.
 * Features inverse status line, room description, interactive prompt, and compass exits.
 */

import { z } from 'zod';
import type { Block, BlockContext, BlockResult } from '../types.js';

const interactionSchema = z.object({
  prompt: z.string(),
  response: z.string(),
}).strict();

const textAdventureSchema = z.object({
  command: z.string().optional(),
  location: z.string().optional(),
  score: z.number().int().optional(),
  maxScore: z.number().int().optional(),
  moves: z.number().int().optional(),
  interactions: z.array(interactionSchema).optional(),
  exits: z.string().optional(),
}).strict();

export const textAdventureBlock: Block = {
  name: 'text-adventure',
  description: 'Classic 1980s text adventure game (Zork / Infocom style)',
  configSchema: textAdventureSchema,

  render(_context: BlockContext, config: Record<string, unknown>): BlockResult {
    const command = (config['command'] as string) ?? 'zork';
    const location = (config['location'] as string) ?? 'West of House';
    const score = (config['score'] as number) ?? 10;
    const maxScore = (config['maxScore'] as number) ?? 100;
    const moves = (config['moves'] as number) ?? 4;
    const exits = (config['exits'] as string) ?? 'NORTH | EAST | SOUTHWEST';

    const interactions = (config['interactions'] as z.infer<typeof interactionSchema>[]) ?? [
      {
        prompt: 'open small mailbox',
        response: 'Opening the small mailbox reveals a leaflet.',
      },
      {
        prompt: 'read leaflet',
        response: '"WELCOME TO ZORK! A game of adventure, danger, and low cunning."',
      },
    ];

    const scoreStr = `Score: ${score}/${maxScore}`.padStart(16);
    const movesStr = `Moves: ${moves}`.padStart(12);
    const header = ` ${location.padEnd(40)}${scoreStr}  ${movesStr} `;
    const divider = '─'.repeat(72);

    const scriptLines: string[] = [];
    for (const item of interactions) {
      scriptLines.push(` > [[bold]][[fg:yellow]]${item.prompt}[[/fg]][[/bold]]`);
      scriptLines.push(` ${item.response}`);
      scriptLines.push('');
    }

    const lines = [
      `[[bold]][[fg:black]][[bg:white]]${header}[[/bg]][[/fg]][[/bold]]`,
      `[[dim]]${divider}[[/dim]]`,
      ' You are standing in an open field west of a white house, with a boarded',
      ' front door. There is a small mailbox here.',
      '',
      ...scriptLines,
      ` [[bold]][[fg:cyan]][ EXITS: ${exits} ][[/fg]][[/bold]]`,
    ];

    return {
      command,
      lines,
    };
  },
};
