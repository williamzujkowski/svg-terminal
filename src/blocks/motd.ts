/**
 * MOTD (Message of the Day) block — welcome banner.
 * Optionally includes live weather data from wttr.in.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';
import { createDoubleBox } from '../core/box-generator.js';
import { fetchWeatherSummary } from './weather.js';

/** MOTD welcome banner block. */
export const motdBlock: Block = {
  name: 'motd',
  description: 'Display a welcome banner / message of the day',

  async render(context: BlockContext, config: Record<string, unknown>): Promise<BlockResult> {
    const title = (config['title'] as string) ?? 'DEV TERMINAL';
    const subtitle = (config['subtitle'] as string) ?? 'Powered by coffee & late-night debugging';
    const width = (config['width'] as number) ?? 58;
    const timeout = context.config.fetchTimeout;

    const date = context.now;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const version = `v${year}.${month}`;

    const lines: string[] = [
      '',
      `${title} ${version}`,
      subtitle,
    ];

    // Weather integration
    const weatherConfig = config['weather'] as Record<string, unknown> | undefined;
    if (weatherConfig) {
      const location = (weatherConfig['location'] as string) ?? '';
      const units = (weatherConfig['units'] as string) ?? 'both';
      const weatherLine = await fetchWeatherSummary(location, units, timeout);
      if (weatherLine) {
        lines.push(`[[fg:cyan]]${weatherLine}[[/fg]]`);
      }
    }

    lines.push('');

    // Optional extra lines
    const extra = config['lines'] as string[] | undefined;
    if (extra) {
      for (const line of extra) {
        lines.push(line);
      }
      lines.push('');
    }

    const box = createDoubleBox(lines, width);
    return {
      command: (config['command'] as string) ?? 'cat /etc/motd',
      lines: box.split('\n'),
      typing: 'fast',
      pause: 'medium',
    };
  },
};
