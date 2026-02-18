/**
 * systemctl block — fake systemd service status.
 */

import type { Block, BlockContext, BlockResult } from '../types.js';

/** systemctl status display block. */
export const systemctlBlock: Block = {
  name: 'systemctl',
  description: 'Display a systemd-style service status',

  render(context: BlockContext, config: Record<string, unknown>): BlockResult {
    const service = (config['service'] as string) ?? 'dev-mode.service';
    const description = (config['description'] as string) ?? 'Development Mode Service';
    const pid = (config['pid'] as string) ?? '1337';
    const memory = (config['memory'] as string) ?? '42.0M';
    const statusLines = (config['logs'] as string[]) ?? [
      'Service started successfully',
      'Maximum productivity achieved',
    ];

    const timestamp = context.now.toISOString().slice(0, 19).replace('T', ' ');

    const lines = [
      `● [[fg:cyan]]${service}[[/fg]] - ${description}`,
      `     [[fg:purple]]Loaded:[[/fg]] loaded (/etc/systemd/${service}; [[fg:green]]enabled[[/fg]])`,
      `     [[fg:purple]]Active:[[/fg]] [[fg:green]]active (running)[[/fg]] since boot`,
      `   [[fg:purple]]Main PID:[[/fg]] ${pid} (${service.replace('.service', '')})`,
      `      [[fg:purple]]Tasks:[[/fg]] ∞`,
      `     [[fg:purple]]Memory:[[/fg]] ${memory}`,
    ];

    for (const log of statusLines) {
      lines.push(`${timestamp} ${service}[${pid}]: [[fg:green]]✓[[/fg]] ${log}`);
    }

    return {
      command: (config['command'] as string) ?? `systemctl status ${service}`,
      lines,
      typing: 'slow',
      pause: 'long',
    };
  },
};
